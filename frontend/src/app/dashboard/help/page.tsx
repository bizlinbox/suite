'use client';

import { useState } from 'react';
import {
  LuMessageSquare as MessageSquare,
  LuUsers as Users,
  LuMegaphone as Megaphone,
  LuChartColumn as BarChart3,
  LuGitBranch as GitBranch,
  LuFileText as FileText,
  LuSettings as Settings,
  LuChevronDown as ChevronDown,
  LuChevronRight as ChevronRight,
  LuMail as Mail,
  LuBookOpen as BookOpen,
  LuCircleAlert as AlertCircle,
  LuCircleCheck as CheckCircle,
  LuZap as Zap,
} from 'react-icons/lu';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'How do I connect my WhatsApp Business Account?',
    answer: 'To connect your WhatsApp Business Account, go to Settings > WABA Accounts and click "Add Account". You will need your WhatsApp Business API credentials from Meta Business Suite.',
  },
  {
    category: 'Getting Started',
    question: 'How do I invite team members?',
    answer: 'Navigate to the Users page in the sidebar, click "Add User", and enter their email address. They will receive an invitation link to join your workspace.',
  },
  {
    category: 'Inbox',
    question: 'How do I manage conversations?',
    answer: 'The Inbox shows all your WhatsApp conversations. Click on any conversation to open the chat window. You can assign conversations to specific agents, mark them as private, or delete them using the options menu.',
  },
  {
    category: 'Inbox',
    question: 'Can I send media files?',
    answer: 'Yes! You can send images, videos, documents, and audio files by clicking the attachment icon in the chat window. Supported formats include JPG, PNG, PDF, MP4, and MP3.',
  },
  {
    category: 'Campaigns',
    question: 'How do I create a campaign?',
    answer: 'Go to Campaigns > New Campaign. Select a template from your synced templates, choose recipients from your contacts, and schedule or send immediately.',
  },
  {
    category: 'Campaigns',
    question: 'What are message templates?',
    answer: 'Message templates are pre-approved message formats required by WhatsApp for sending messages outside of 24-hour conversation windows. Templates must be approved by Meta before use.',
  },
  {
    category: 'Automations',
    question: 'How do automations work?',
    answer: 'Automations allow you to create workflow rules that trigger actions based on specific conditions. For example, you can auto-assign conversations or send automatic responses.',
  },
  {
    category: 'Automations',
    question: 'Can I use AI for responses?',
    answer: 'Yes! You can configure AI Agents in the AI Agents section. These can automatically respond to common queries and escalate complex issues to human agents.',
  },
  {
    category: 'Analytics',
    question: 'What metrics are tracked?',
    answer: 'Analytics track response times, conversation volume, agent performance, message delivery rates, and customer engagement patterns.',
  },
  {
    category: 'Settings',
    question: 'How do I manage user permissions?',
    answer: 'In the Users section, admins can assign roles (Admin, Agent) and manage WABA account access for each team member.',
  },
];

const quickActions = [
  {
    icon: MessageSquare,
    title: 'Send a Message',
    description: 'Learn how to send different types of messages',
    href: '#inbox',
  },
  {
    icon: Megaphone,
    title: 'Create Campaign',
    description: 'Step-by-step campaign creation guide',
    href: '#campaigns',
  },
  {
    icon: Users,
    title: 'Manage Contacts',
    description: 'Organize and segment your contacts',
    href: '#contacts',
  },
  {
    icon: GitBranch,
    title: 'Setup Automations',
    description: 'Automate your workflow processes',
    href: '#automations',
  },
];

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

export default function HelpPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const categories = Array.from(new Set(faqs.map(f => f.category)));

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
    setExpandedFaq(null);
  };

  const toggleFaq = (question: string) => {
    setExpandedFaq(expandedFaq === question ? null : question);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <div>
          <h1>Help Center</h1>
          <p>Find answers, guides, and support resources</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <a
                key={action.title}
                href={action.href}
                className="panel flex flex-col items-center p-6 text-center transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                  <Icon size={24} />
                </div>
                <h3 className="mb-1 font-medium text-gray-900 dark:text-gray-100">{action.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{action.description}</p>
              </a>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Frequently Asked Questions</h2>
        <div className="panel divide-y divide-gray-100 dark:divide-gray-800">
          {categories.map((category) => {
            const categoryFaqs = faqs.filter(f => f.category === category);
            const isCategoryExpanded = expandedCategory === category;
            
            return (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen size={20} className="text-primary-600 dark:text-primary-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">{category}</span>
                  </div>
                  {isCategoryExpanded ? (
                    <ChevronDown size={20} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-400" />
                  )}
                </button>
                
                {isCategoryExpanded && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {categoryFaqs.map((faq, index) => {
                      const isFaqExpanded = expandedFaq === faq.question;
                      return (
                        <div key={index} className="px-6 py-4">
                          <button
                            onClick={() => toggleFaq(faq.question)}
                            className="flex w-full items-start justify-between text-left"
                          >
                            <span className="font-medium text-gray-900 dark:text-gray-100">{faq.question}</span>
                            {isFaqExpanded ? (
                              <ChevronDown size={18} className="mt-0.5 shrink-0 text-gray-400" />
                            ) : (
                              <ChevronRight size={18} className="mt-0.5 shrink-0 text-gray-400" />
                            )}
                          </button>
                          {isFaqExpanded && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{faq.answer}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Common Issues</h2>
        <div className="panel divide-y divide-gray-100 dark:divide-gray-800">
          {troubleshooting.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <Icon size={20} />
                </div>
                <div className="flex-1">
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

      {/* Tips Section */}
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
