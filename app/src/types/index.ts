export interface User {
  username: string;
  token: string;
  user_type: 'management' | 'factory';
}

export interface Employee {
  name: string;
  employee_code: string;
}

export interface Procedure {
  id: number;
  name: string;
  description: string;
  stages: Stage[];
}

export interface Step {
  id: number;
  text: string;
  subtitle: string | null;
  expected_type: 'text' | 'number' | 'boolean' | 'choice' | 'time';
  options?: string | null;
  order: number;
  depends_on: number | null;
  multiplier: number | null;
  is_pre_definition: boolean;
  photo_mandatory: boolean;
}

export interface Stage {
  id: number;
  name: string;
  order: number;
  steps: Step[];
}

export interface StepAnswer {
  id: number;
  step: number;
  value: string;
  image: string | null;
  comment: string | null;
  answered_at: string;
}

export interface StageExecution {
  id: number;
  stage: number; // Stage ID
  employee: number | null;
  employee_name?: string;
  start_time: string | null;
  end_time: string | null;
  answers: StepAnswer[];
}

export interface ExecutionSignature {
  id: number;
  signer_name: string;
  role: string;
  signature_image: string;
  signed_at: string;
}

export interface ProcedureExecution {
  id: number;
  procedure: number; // Procedure ID
  status: 'scheduled' | 'pending' | 'in_progress' | 'completed';
  quantity: number;
  enclosure: string;
  planned_date: string | null;
  start_time: string | null;
  end_time: string | null;
  stage_executions: StageExecution[];
  pre_definitions: StepAnswer[];
  signatures: ExecutionSignature[];
}
