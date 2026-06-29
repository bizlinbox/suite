'use client';

export interface ContactFormData {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  birthday?: string;
  language?: string;
  tags?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

interface ContactFormProps {
  value: ContactFormData;
  onChange: (field: keyof ContactFormData, value: string) => void;
}

export default function ContactForm({ value, onChange }: ContactFormProps) {
  const handleChange = (field: keyof ContactFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(field, e.target.value);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Basic Info */}
      <Section title="Basic Info">
        <Field label="Name">
          <input
            type="text"
            value={value.name}
            onChange={handleChange('name')}
            required
            className="input"
            placeholder="Full name"
          />
        </Field>
        <Field label="Phone">
          <input
            type="text"
            value={value.phone}
            onChange={handleChange('phone')}
            required
            className="input"
            placeholder="+1 234 567 8900"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={value.email || ''}
            onChange={handleChange('email')}
            className="input"
            placeholder="email@example.com"
          />
        </Field>
      </Section>

      {/* Work */}
      <Section title="Work">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company">
            <input
              type="text"
              value={value.company || ''}
              onChange={handleChange('company')}
              className="input"
              placeholder="Acme Inc."
            />
          </Field>
          <Field label="Job Title">
            <input
              type="text"
              value={value.jobTitle || ''}
              onChange={handleChange('jobTitle')}
              className="input"
              placeholder="Manager"
            />
          </Field>
        </div>
      </Section>

      {/* Location */}
      <Section title="Location">
        <Field label="Street Address">
          <input
            type="text"
            value={value.address || ''}
            onChange={handleChange('address')}
            className="input"
            placeholder="123 Main St"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <input
              type="text"
              value={value.city || ''}
              onChange={handleChange('city')}
              className="input"
              placeholder="New York"
            />
          </Field>
          <Field label="State / Province">
            <input
              type="text"
              value={value.state || ''}
              onChange={handleChange('state')}
              className="input"
              placeholder="NY"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country">
            <input
              type="text"
              value={value.country || ''}
              onChange={handleChange('country')}
              className="input"
              placeholder="United States"
            />
          </Field>
          <Field label="ZIP / Postal">
            <input
              type="text"
              value={value.zipCode || ''}
              onChange={handleChange('zipCode')}
              className="input"
              placeholder="10001"
            />
          </Field>
        </div>
      </Section>

      {/* Other */}
      <Section title="Other">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Birthday">
            <input
              type="date"
              value={value.birthday || ''}
              onChange={handleChange('birthday')}
              className="input"
            />
          </Field>
          <Field label="Language">
            <input
              type="text"
              value={value.language || ''}
              onChange={handleChange('language')}
              className="input"
              placeholder="en"
            />
          </Field>
        </div>
        <Field label="Tags">
          <input
            type="text"
            value={value.tags || ''}
            onChange={handleChange('tags')}
            className="input"
            placeholder="vip, support, prospect"
          />
        </Field>
        <Field label="Notes">
          <textarea
            value={value.notes || ''}
            onChange={handleChange('notes')}
            rows={3}
            className="input resize-none"
            placeholder="Any additional notes..."
          />
        </Field>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 pb-5 last:border-0 dark:border-gray-800">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
    </div>
  );
}
