export type PipelineStage = "NEW" | "PASS_CLAIMED" | "TOUR_BOOKED" | "HUMAN_PAUSED";

export type Bindings = {
  DB: D1Database;
  GEMINI_MODEL: string;
  GEMINI_API_KEY: string;
};

export type Gym = {
  id: number;
  slug: string;
  name: string;
  phone_number_id: string;
  whatsapp_token: string;
  meta_app_secret: string;
  business_context: string;
  booking_link: string | null;
  slack_webhook_url: string | null;
  active: number;
  created_at: string;
};

export type Lead = {
  id: number;
  gym_id: number;
  phone: string;
  name: string | null;
  extracted_goal: string | null;
  pipeline_stage: "NEW" | "PASS_CLAIMED" | "TOUR_BOOKED" | "HUMAN_PAUSED";
  last_message_at: string;
  created_at: string;
};

export type Message = {
  id: number;
  lead_id: number;
  role: "user" | "assistant";
  text: string;
  created_at: string;
};

export type GeminiStructuredReply = {
  whatsapp_reply: string;
  extracted_goal: string | null;
  pipeline_stage: "NEW" | "PASS_CLAIMED" | "TOUR_BOOKED" | "HUMAN_PAUSED";
};

export interface EventAutomationRequest {
  eventName: string;
  linkedOffer: string;
  duration: string;
  audienceSegment: string;
}