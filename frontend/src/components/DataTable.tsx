import React from 'react'
import {Table, TableBody, TableCell, TableHeader, TableRow} from "@/components/ui/table.tsx";


export type Column<T> = {
    header: () => React.ReactNode
    cell: (row: T) => React.ReactNode
}

type TableSimpleProps<T> = {
    columns: Column<T>[]
    data: T[]
}

export default function DataTable<T>({columns, data}: TableSimpleProps<T>) {
    return (
        <Table className='max-h-[600px] overflow-y-auto'>
            <TableHeader className=' bg-primaryLighter'>
                <TableRow>
                    {columns.map((column, i) => (
                        <TableCell align='center' className='font-semibold' key={i}>
                            {column.header()}
                        </TableCell>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data?.map((row, i) => (
                    <TableRow
                        key={i}
                        className={
                            'hover:bg-[var(--mui-palette-action-hover)]'
                        }

                    >
                        {columns.map((column, j) => (
                            <TableCell align='center' key={j}>
                                {column.cell(row)}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
