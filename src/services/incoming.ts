import type { Bindings, Gym } from "../types";
import { getOrCreateLead, touchLead, applyStructuredUpdate, setHumanPaused, isHumanPaused } from "./leads";
import { pushMessage, getRecentHistory } from "./messages";
import { generateStructuredReply } from "./gemini";
import { sendWhatsAppMessage } from "./whatsapp";
import { notifySlack } from "./slack";
import { isStopWord } from "./stopwords";
import { listOffers } from "./offers";
import { listPricingPlans } from "./pricing";
import { listEvents } from "./events";

export async function handleIncomingMessage(
  env: Bindings,
  gym: Gym,
  message: any,
  contactName?: string | null
): Promise<void> {
  const db = env.DB;
  const from = message.from as string;

  const lead = await getOrCreateLead(db, gym.id, from, contactName ?? null);
  await touchLead(db, lead.id);

  if (message.type !== "text") {
    await sendWhatsAppMessage(gym, from, "Thanks for your message! We can only read text right now - could you type that out for us?");
    return;
  }

  const text = message.text?.body as string;
  if (!text) return;

  await pushMessage(db, lead.id, "user", text);

  if (await isHumanPaused(db, lead.id)) {
    console.log(`[${gym.name}] Lead ${from} is HUMAN_PAUSED - skipping AI.`);
    return;
  }

  if (isStopWord(text)) {
    await setHumanPaused(db, lead.id);
    const reply = "Got it — a team member will follow up with you shortly.";
    await pushMessage(db, lead.id, "assistant", reply);
    await sendWhatsAppMessage(gym, from, reply);
    await notifySlack(gym, from, text);
    return;
  }

  const [offers, pricingPlans, events, history] = await Promise.all([
    listOffers(db, gym.id),
    listPricingPlans(db, gym.id),
    listEvents(db, gym.id),
    getRecentHistory(db, lead.id, 10),
  ]);

  const structured = await generateStructuredReply(
    env.GEMINI_API_KEY,
    env.GEMINI_MODEL,
    gym,
    offers,
    pricingPlans,
    events,
    history.slice(0, -1),
    text
  );

  await pushMessage(db, lead.id, "assistant", structured.whatsapp_reply);
  await applyStructuredUpdate(db, lead.id, structured.pipeline_stage as "NEW" | "PASS_CLAIMED" | "TOUR_BOOKED", structured.extracted_goal);
  await sendWhatsAppMessage(gym, from, structured.whatsapp_reply);
}