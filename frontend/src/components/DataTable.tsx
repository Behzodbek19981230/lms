import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

export type Column<T> = {
	key: keyof T | string;
	header: () => React.ReactNode;
	cell: (row: T) => React.ReactNode;
	sortable?: boolean;
};

type DataTableProps<T> = {
	columns: Column<T>[];
	data: T[];
	onRowClick?: (row: T) => void;
	className?: string;
};

export default function DataTable<T>({ columns, data, onRowClick, className = '' }: DataTableProps<T>) {
	const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({
		key: null,
		direction: 'asc',
	});

	const handleSort = (key: string) => {
		let direction: 'asc' | 'desc' = 'asc';
		if (sortConfig.key === key && sortConfig.direction === 'asc') {
			direction = 'desc';
		}
		setSortConfig({ key, direction });
	};

	const sortedData = React.useMemo(() => {
		if (!sortConfig.key) return data;

		return [...data].sort((a, b) => {
			const key = sortConfig.key as keyof T;
			const aValue = a[key];
			const bValue = b[key];

			// Handle different data types
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
			}

			if (aValue < bValue) {
				return sortConfig.direction === 'asc' ? -1 : 1;
			}
			if (aValue > bValue) {
				return sortConfig.direction === 'asc' ? 1 : -1;
			}
			return 0;
		});
	}, [data, sortConfig]);

	const getSortIcon = (columnKey: string) => {
		if (sortConfig.key !== columnKey) {
			return <ChevronsUpDown className='ml-2 h-4 w-4' />;
		}
		return sortConfig.direction === 'asc' ? (
			<ChevronUp className='ml-2 h-4 w-4' />
		) : (
			<ChevronDown className='ml-2 h-4 w-4' />
		);
	};

	return (
		<div className={`rounded-md border ${className}`}>
			<Table>
				<TableHeader className='bg-muted'>
					<TableRow>
						{columns.map((column, i) => (
							<TableHead
								key={i}
								className='font-semibold text-center'
								onClick={() => column.sortable && handleSort(column.key as string)}
								style={{ cursor: column.sortable ? 'pointer' : 'default' }}
							>
								<div className='flex items-center justify-center'>
									{column.header()}
									{column.sortable && getSortIcon(column.key as string)}
								</div>
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{sortedData?.map((row, i) => (
						<TableRow
							key={i}
							className={`hover:bg-muted/50 ${onRowClick ? 'cursor-pointer' : ''}`}
							onClick={() => onRowClick?.(row)}
						>
							{columns.map((column, j) => (
								<TableCell align='center' key={j}>
									{column.cell(row)}
								</TableCell>
							))}
						</TableRow>
					))}
					{sortedData?.length === 0 && (
						<TableRow>
							<TableCell colSpan={columns.length} className='text-center py-8 text-muted-foreground'>
								Ma'lumot topilmadi
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
