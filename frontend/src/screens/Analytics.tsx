import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { request } from '@/configs/request';
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	BarChart,
	Bar,
} from 'recharts';

type DailyRow = { date: string; logins: number; pageviews: number };
type CountRow = { count: string | number } & Record<string, any>;

export default function AnalyticsPage() {
	const [days, setDays] = useState('14');
	const [loading, setLoading] = useState(true);
	const [summary, setSummary] = useState<any>(null);

	useEffect(() => {
		let mounted = true;
		setLoading(true);
		request
			.get('/analytics/admin/summary', { params: { days } })
			.then((res) => {
				if (mounted) setSummary(res.data);
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, [days]);

	const daily: DailyRow[] = useMemo(() => summary?.daily || [], [summary]);
	const topRoutes = useMemo(
		() =>
			(summary?.topRoutes || []).map((r: any) => ({
				path: r.path,
				count: Number(r.count || 0),
			})),
		[summary]
	);

	const devices = useMemo(
		() =>
			(summary?.devices || []).map((r: any) => ({
				deviceType: r.deviceType,
				count: Number(r.count || 0),
			})),
		[summary]
	);

	const totalLogins = useMemo(() => daily.reduce((s, r) => s + (r.logins || 0), 0), [daily]);
	const totalPageviews = useMemo(() => daily.reduce((s, r) => s + (r.pageviews || 0), 0), [daily]);

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between gap-3 flex-wrap'>
				<div>
					<h1 className='text-2xl font-bold'>Analytics</h1>
					<p className='text-sm text-muted-foreground'>Login va sahifa kirish statistikasi (superadmin)</p>
				</div>
				<div className='w-44'>
					<Select value={days} onValueChange={setDays}>
						<SelectTrigger>
							<SelectValue placeholder='Days' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='7'>So‘nggi 7 kun</SelectItem>
							<SelectItem value='14'>So‘nggi 14 kun</SelectItem>
							<SelectItem value='30'>So‘nggi 30 kun</SelectItem>
							<SelectItem value='60'>So‘nggi 60 kun</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
				<Card>
					<CardHeader>
						<CardTitle>Logins</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-3xl font-bold'>{loading ? '...' : totalLogins}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Page views</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-3xl font-bold'>{loading ? '...' : totalPageviews}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Range</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-sm text-muted-foreground'>{loading ? '...' : summary?.since?.slice(0, 10)}</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Daily trend</CardTitle>
				</CardHeader>
				<CardContent style={{ height: 320 }}>
					<ResponsiveContainer width='100%' height='100%'>
						<LineChart data={daily}>
							<CartesianGrid strokeDasharray='3 3' />
							<XAxis dataKey='date' />
							<YAxis />
							<Tooltip />
							<Line type='monotone' dataKey='logins' stroke='#2563eb' strokeWidth={2} />
							<Line type='monotone' dataKey='pageviews' stroke='#16a34a' strokeWidth={2} />
						</LineChart>
					</ResponsiveContainer>
				</CardContent>
			</Card>

			<div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
				<Card>
					<CardHeader>
						<CardTitle>Top pages</CardTitle>
					</CardHeader>
					<CardContent style={{ height: 320 }}>
						<ResponsiveContainer width='100%' height='100%'>
							<BarChart data={topRoutes} layout='vertical' margin={{ left: 8, right: 8 }}>
								<CartesianGrid strokeDasharray='3 3' />
								<XAxis type='number' />
								<YAxis
									type='category'
									dataKey='path'
									width={180}
									tickFormatter={(v: string) => (v?.length > 28 ? `${v.slice(0, 28)}…` : v)}
								/>
								<Tooltip
									formatter={(value: any) => [value, 'Views']}
									labelFormatter={(label: any) => `Page: ${label}`}
								/>
								<Bar dataKey='count' fill='#0ea5e9' />
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Devices</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-2 text-sm'>
							{devices.length === 0 ? (
								<div className='text-muted-foreground'>Hali ma’lumot yo‘q (pageview yig‘ilishini kuting)</div>
							) : (
								devices.map((d: any) => (
									<div key={d.deviceType} className='flex items-center justify-between'>
										<span>{d.deviceType}</span>
										<span className='text-muted-foreground'>{d.count}</span>
									</div>
								))
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
