'use client';

import {
  LuMail as Mail,
  LuCircleAlert as AlertCircle,
  LuCircleCheck as CheckCircle,
  LuZap as Zap,
} from 'react-icons/lu';

const troubleshooting = [
  {
    icon: AlertCircle,
    title: 'Messages not delivering',
    solution: 'Check your WABA account status and ensure your phone number is verified in Meta Business Suite.',
  },
  {
    icon: AlertCircle,
    title: 'Template not approved',
    solution: 'Templates must comply with WhatsApp Commerce Policy. Edit your template and resubmit for approval.',
  },
  {
    icon: AlertCircle,
    title: 'Cannot see conversations',
    solution: 'Ensure you have the correct permissions and that your WABA account is properly connected.',
  },
];

export default function KnowledgeBasePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Knowledge Base</h1>
          <p>Find answers, guides, and support resources</p>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Troubleshooting</h2>
        <div className="panel divide-y divide-gray-100 dark:divide-gray-800">
          {troubleshooting.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-start gap-3 px-6 py-4">
                <Icon size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.solution}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact Support */}
      <div className="panel p-6">
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left">
          <div className="mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 sm:mb-0 sm:mr-6">
            <Mail size={32} />
          </div>
          <div className="flex-1">
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Still need help?</h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Can't find what you're looking for? Contact our support team for personalized assistance.
            </p>
            <a
              href="mailto:support@bizlinbox.com"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Mail size={16} />
              Contact Support
            </a>
          </div>
        </div>
      </div>

      {/* Pro Tips */}
      <div className="mt-8 panel bg-gradient-to-br from-primary-50 to-primary-100 p-6 dark:from-primary-900/20 dark:to-primary-800/20">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-200 text-primary-800 dark:bg-primary-800/40 dark:text-primary-300">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Pro Tips</h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-primary-600 dark:text-primary-400" />
                <span>Use keyboard shortcuts (Ctrl+K) to quickly access conversations</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-primary-600 dark:text-primary-400" />
                <span>Set up quick replies for common customer inquiries</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-primary-600 dark:text-primary-400" />
                <span>Enable automations to reduce response time and improve efficiency</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-primary-600 dark:text-primary-400" />
                <span>Monitor analytics regularly to identify trends and improve performance</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
