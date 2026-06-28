'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
  loadingText?: string;
  colSpan?: number;
}

const cn = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

export function Table({ children, className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('data-table', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y divide-gray-100 dark:divide-gray-800', className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-gray-100 transition-colors duration-150 last:border-b-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return (
    <th className={cn('px-4 py-3', className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableDataCellElement>) {
  return (
    <td className={cn('px-4 py-3 text-gray-700 dark:text-gray-300', className)} {...props}>
      {children}
    </td>
  );
}

export function TableEmpty({ colSpan = 1, children }: { colSpan?: number; children?: React.ReactNode }) {
  return (
    <TableRow>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
        {children ?? 'No data found'}
      </td>
    </TableRow>
  );
}

export function TableLoading({ colSpan = 1, children }: { colSpan?: number; children?: React.ReactNode }) {
  return (
    <TableRow>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
        <div className="flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          {children ?? 'Loading...'}
        </div>
      </td>
    </TableRow>
  );
}

/*
 * Higher-level DataTable for simple column-driven tables.
 */
export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  className?: string;
  headClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T, index: number) => string;
  loading?: boolean;
  emptyText?: string;
  rowClassName?: (row: T, index: number) => string | undefined;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  emptyText = 'No data found',
  rowClassName,
}: DataTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        <tr>
          {columns.map((col) => (
            <TableHead key={col.key} className={col.headClassName}>
              {col.header}
            </TableHead>
          ))}
        </tr>
      </TableHeader>
      <TableBody>
        {loading && <TableLoading colSpan={columns.length} />}
        {!loading && data.length === 0 && <TableEmpty colSpan={columns.length}>{emptyText}</TableEmpty>}
        {!loading &&
          data.map((row, index) => (
            <TableRow key={keyExtractor(row, index)} className={rowClassName?.(row, index)}>
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.cell(row, index)}
                </TableCell>
              ))}
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
