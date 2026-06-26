import re

def replace_all(text, old, new):
    return text.replace(old, new)

def replace_once(text, old, new):
    return text.replace(old, new, 1)

# ===== File 1: campaigns/page.tsx =====
with open(r'E:\bizlinbox\frontend\src\app\dashboard\campaigns\page.tsx', 'r', encoding='utf-8') as f:
    c1 = f.read()

# Empty state card (line 164)
c1 = replace_once(c1,
    'rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm',
    'rounded-clay bg-white shadow-clay dark:bg-clay-darkSurface dark:shadow-clay-dark')

# Refresh Templates button (line 189)
c1 = replace_once(c1,
    'className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"',
    'className="inline-flex items-center gap-1.5 rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"')

# New Campaign link button (line 196)
c1 = replace_once(c1,
    'className="inline-flex items-center gap-2 rounded-lg bg-primary-900 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"',
    'className="inline-flex items-center gap-2 rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 bg-primary-900 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"')

# Refresh message banner (line 206)
c1 = replace_once(c1, 'rounded-lg px-4 py-2 text-sm font-medium', 'rounded-clay px-4 py-2 text-sm font-medium')

# Type filter tabs (line 223)
c1 = replace_once(c1, 'rounded-full px-4 py-1.5 text-sm font-medium transition-colors', 'rounded-clay-lg px-4 py-1.5 text-sm font-medium transition-colors')

# All Status chip (line 238)
c1 = replace_once(c1, 'rounded-full px-3 py-1 text-xs font-medium transition-colors', 'rounded-clay-lg px-3 py-1 text-xs font-medium transition-colors')

# Status chips inside map (line 250) - same pattern, second occurrence
c1 = replace_once(c1, 'rounded-full px-3 py-1 text-xs font-medium transition-colors', 'rounded-clay-lg px-3 py-1 text-xs font-medium transition-colors')

# Table wrapper (line 262)
c1 = replace_once(c1,
    'className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm"',
    'className="overflow-x-auto rounded-clay shadow-clay"')

# Type badge (line 301)
c1 = replace_once(c1, 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', 'inline-flex items-center rounded-clay-lg px-2.5 py-0.5 text-xs font-medium')

# Status badge (line 306)
c1 = replace_once(c1, 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', 'inline-flex items-center rounded-clay-lg px-2.5 py-0.5 text-xs font-medium')

# Progress bar background (line 316)
c1 = replace_once(c1, 'overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700', 'overflow-hidden rounded-clay-sm bg-gray-200 dark:bg-gray-700')

# Progress bar fill (line 318)
c1 = replace_once(c1, 'h-full rounded-full bg-primary-600 dark:bg-primary-500 transition-all', 'h-full rounded-clay-sm bg-primary-600 dark:bg-primary-500 transition-all')

# Action icon buttons - do specific unique replacements
btn_replacements = [
    ('className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"',
     'className="rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"'),
    ('className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"',
     'className="rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"'),
    ('className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"',
     'className="rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"'),
    ('className="rounded-lg p-1.5 text-orange-500 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"',
     'className="rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 p-1.5 text-orange-500 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"'),
    ('className="rounded-lg p-1.5 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"',
     'className="rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 p-1.5 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"'),
]
for old, new in btn_replacements:
    c1 = replace_all(c1, old, new)

with open(r'E:\bizlinbox\frontend\src\app\dashboard\campaigns\page.tsx', 'w', encoding='utf-8') as f:
    f.write(c1)

print('File 1 done')
