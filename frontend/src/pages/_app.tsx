import type { AppProps } from 'next/app';
import Providers from '../../providers';
import '../index.css';

export default function MyApp({ Component, pageProps }: AppProps) {
	return (
		<Providers>
			<Component {...pageProps} />
		</Providers>
	);
}
