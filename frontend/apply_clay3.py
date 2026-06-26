import re

def replace_all(text, old, new):
    return text.replace(old, new)

def replace_once(text, old, new):
    return text.replace(old, new, 1)

# ===== File 3: campaigns/[id]/page.tsx =====
with open(r'E:\bizlinbox\frontend\src\app\dashboard\campaigns\[id]\page.tsx', 'r', encoding='utf-8') as f:
    c3 = f.read()

# Empty state card (line 182)
c3 = replace_once(c3,
    'rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center',
    'rounded-clay bg-white shadow-clay dark:bg-clay-darkSurface dark:shadow-clay-dark p-8 text-center')

# Back link button (line 202)
c3 = replace_once(c3,
    'className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"',
    'className="rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"')

# Status badge (line 212)
c3 = replace_once(c3,
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    'inline-flex items-center rounded-clay-lg px-2.5 py-0.5 text-xs font-medium')

# Action icon buttons
c3 = replace_all(c3,
    'className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"',
    'className="rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"')

c3 = replace_all(c3,
    'className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"',
    'className="rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"')

c3 = replace_all(c3,
    'className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"',
    'className="rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"')

c3 = replace_all(c3,
    'className="rounded-lg p-1.5 text-orange-500 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"',
    'className="rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 p-1.5 text-orange-500 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"')

c3 = replace_all(c3,
    'className="rounded-lg p-1.5 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"',
    'className="rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 p-1.5 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"')

# Stat cards (lines 325, 334, 343, 352, 361)
c3 = replace_all(c3,
    'rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm',
    'rounded-clay bg-white shadow-clay dark:bg-clay-darkSurface dark:shadow-clay-dark p-4')

# Delivery rate card (line 373)
c3 = replace_once(c3,
    'className="mb-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm"',
    'className="mb-6 rounded-clay bg-white shadow-clay dark:bg-clay-darkSurface dark:shadow-clay-dark p-4"')

# Progress bar background (line 380)
c3 = replace_once(c3,
    'className="h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"',
    'className="h-2.5 overflow-hidden rounded-clay-sm bg-gray-200 dark:bg-gray-700"')

# Progress bar fill (line 382)
c3 = replace_once(c3,
    'className="h-full rounded-full bg-primary-600 dark:bg-primary-500 transition-all"',
    'className="h-full rounded-clay-sm bg-primary-600 dark:bg-primary-500 transition-all"')

# Message content card (line 389)
c3 = replace_once(c3,
    'className="mb-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm"',
    'className="mb-6 rounded-clay bg-white shadow-clay dark:bg-clay-darkSurface dark:shadow-clay-dark p-4"')

# Inner message box (line 391)
c3 = replace_once(c3,
    'className="rounded-lg bg-gray-50 dark:bg-gray-950 p-4"',
    'className="rounded-clay bg-gray-50 dark:bg-gray-950 p-4"')

# Recipients table wrapper (line 406)
c3 = replace_once(c3,
    'className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm"',
    'className="rounded-clay shadow-clay overflow-hidden"')

# Recipient status badge (line 426)
c3 = replace_once(c3,
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    'inline-flex items-center rounded-clay-lg px-2.5 py-0.5 text-xs font-medium')

# Pagination buttons (lines 460, 467)
c3 = replace_all(c3,
    'className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"',
    'className="rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"')

with open(r'E:\bizlinbox\frontend\src\app\dashboard\campaigns\[id]\page.tsx', 'w', encoding='utf-8') as f:
    f.write(c3)

print('File 3 done')
