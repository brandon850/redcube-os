export type FieldType = 'short_text' | 'long_text' | 'email' | 'phone' | 'dropdown' | 'checkbox'

export interface FormField {
  id: string
  type: FieldType
  key: string // property name in submission data
  label: string
  placeholder?: string
  required?: boolean
  width?: 'full' | 'half'
  options?: string[] // for dropdown
}

export interface FormSettings {
  after: 'message' | 'redirect'
  success_message: string
  redirect_url?: string
  stage_id?: string | null // pipeline stage to create the deal in
  sequence_id?: string | null // sequence to enroll (Phase 4)
  assign_to?: string | null // user id | 'round_robin' | null
  send_confirmation?: boolean
  notify_rep?: boolean
  honeypot?: boolean
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: 'Short text',
  long_text: 'Long text',
  email: 'Email',
  phone: 'Phone',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
}

export const HONEYPOT_KEY = '_hp'

export const DEFAULT_SETTINGS: FormSettings = {
  after: 'message',
  success_message: "Thanks! We'll be in touch shortly.",
  redirect_url: '',
  stage_id: null,
  sequence_id: null,
  assign_to: null,
  send_confirmation: false,
  notify_rep: true,
  honeypot: true,
}

/** A new form starts with a name + email field (email is required for dedupe). */
export function defaultFields(): FormField[] {
  return [
    { id: 'f_name', type: 'short_text', key: 'name', label: 'Name', required: true, width: 'full' },
    { id: 'f_email', type: 'email', key: 'email', label: 'Email', required: true, width: 'full' },
  ]
}
