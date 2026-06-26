import re

def replace_all(text, old, new):
    return text.replace(old, new)

def replace_once(text, old, new):
    return text.replace(old, new, 1)

# ===== File 2: campaigns/new/page.tsx =====
with open(r'E:\bizlinbox\frontend\src\app\dashboard\campaigns\new\page.tsx', 'r', encoding='utf-8') as f:
    c2 = f.read()

# Empty state card (line 347)
c2 = replace_once(c2,
    'rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm',
    'rounded-clay bg-white shadow-clay dark:bg-clay-darkSurface dark:shadow-clay-dark')

# Step indicator circle (line 374)
c2 = replace_once(c2,
    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
    'flex h-8 w-8 items-center justify-center rounded-clay-lg text-sm font-semibold')

# Main card (line 400)
c2 = replace_once(c2,
    'className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-6"',
    'className="rounded-clay bg-white shadow-clay dark:bg-clay-darkSurface dark:shadow-clay-dark p-6"')

# Name input (line 412)
c2 = replace_once(c2,
    'className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"',
    'className="w-full rounded-clay shadow-clay-input dark:shadow-clay-dark-input border-0 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"')

# Radio card labels (lines 422, 433)
c2 = replace_all(c2,
    'className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"',
    'className="flex cursor-pointer items-center gap-2 rounded-clay border border-gray-200 dark:border-gray-700 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"')

# WABA select (line 454)
c2 = replace_once(c2,
    'className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"',
    'className="w-full rounded-clay shadow-clay-input dark:shadow-clay-dark-input border-0 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"')

# Refresh templates button (line 479)
c2 = replace_once(c2,
    'className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50 dark:text-primary-400 dark:hover:bg-primary-900/20"',
    'className="flex items-center gap-1 rounded-clay-sm shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50 dark:text-primary-400 dark:hover:bg-primary-900/20"')

# Template select (line 488)
c2 = replace_once(c2,
    'className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"',
    'className="w-full rounded-clay shadow-clay-input dark:shadow-clay-dark-input border-0 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"')

# Message content textarea (line 518)
c2 = replace_once(c2,
    'className={`w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
    'className={`w-full rounded-clay shadow-clay-input dark:shadow-clay-dark-input border-0 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500')

# Template variable input (line 544)
c2 = replace_once(c2,
    'className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"',
    'className="w-full rounded-clay shadow-clay-input dark:shadow-clay-dark-input border-0 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"')

# Preview container (line 561)
c2 = replace_once(c2,
    'className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4"',
    'className="rounded-clay border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4"')

# Message bubble shadow (line 562)
c2 = replace_once(c2, 'bg-white dark:bg-gray-800 p-4 shadow-sm', 'bg-white dark:bg-gray-800 p-4 shadow-clay')

# Recipient tab buttons (lines 581, 591) - add rounded-clay-sm
c2 = replace_all(c2,
    "className={`px-4 py-2 text-sm font-medium ${",
    "className={`rounded-clay-sm px-4 py-2 text-sm font-medium ${")

# Search input (line 611)
c2 = replace_once(c2,
    'className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"',
    'className="w-full rounded-clay shadow-clay-input dark:shadow-clay-dark-input border-0 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"')

# Contacts table wrapper (line 616)
c2 = replace_once(c2,
    'className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800"',
    'className="overflow-x-auto rounded-clay shadow-clay"')

# Manual entry textarea (line 676)
c2 = replace_once(c2,
    'className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"',
    'className="w-full rounded-clay shadow-clay-input dark:shadow-clay-dark-input border-0 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"')

# Recipient summary box (line 686)
c2 = replace_once(c2,
    'className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3"',
    'className="rounded-clay bg-gray-50 dark:bg-gray-800/50 p-3"')

# Schedule radio labels (lines 703, 715)
c2 = replace_all(c2,
    'className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"',
    'className="flex cursor-pointer items-center gap-3 rounded-clay border border-gray-200 dark:border-gray-700 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"')

# Schedule date input (line 739)
c2 = replace_once(c2,
    'className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"',
    'className="w-full rounded-clay shadow-clay-input dark:shadow-clay-dark-input border-0 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"')

# Summary box (line 749)
c2 = replace_once(c2,
    'className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4 space-y-3"',
    'className="rounded-clay border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4 space-y-3"')

# Create Campaign button (line 783)
c2 = replace_once(c2,
    'className="mt-4 w-full rounded-lg bg-primary-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"',
    'className="mt-4 w-full rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 bg-primary-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"')

# Back button (line 798)
c2 = replace_once(c2,
    "className={`inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 ${",
    "className={`inline-flex items-center justify-center gap-2 rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 ${")

# Next button (line 808)
c2 = replace_once(c2,
    "className={`inline-flex items-center justify-center gap-2 rounded-lg bg-primary-900 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 ${",
    "className={`inline-flex items-center justify-center gap-2 rounded-clay shadow-clay-btn hover:shadow-clay-btn-active dark:shadow-clay-dark-btn dark:hover:shadow-clay-dark-btn-active transition-all duration-200 bg-primary-900 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 ${")

with open(r'E:\bizlinbox\frontend\src\app\dashboard\campaigns\new\page.tsx', 'w', encoding='utf-8') as f:
    f.write(c2)

print('File 2 done')
