export type User = {
  id: number;
  email: string;
  role: "agency" | "gym_owner";
  gym_id: number | null;
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

export type PipelineStage = "NEW" | "PASS_CLAIMED" | "TOUR_BOOKED" | "HUMAN_PAUSED";

export type Lead = {
  id: number;
  gym_id: number;
  gym_name?: string;
  phone: string;
  name: string | null;
  extracted_goal: string | null;
  pipeline_stage: PipelineStage;
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

export type Offer = {
  id: number;
  gym_id: number;
  title: string;
  description: string;
  valid_until: string | null;
};

export type PricingPlan = {
  id: number;
  gym_id: number;
  name: string;
  price: string;
  billing_period: string;
  includes: string | null;
};

export type GymEvent = {
  id: number;
  gym_id: number;
  title: string;
  description: string | null;
  event_time: string;
  capacity: number | null;
};

export type StageCounts = {
  gym_id?: number;
  gym_name?: string;
  NEW: number;
  PASS_CLAIMED: number;
  TOUR_BOOKED: number;
  HUMAN_PAUSED: number;
};