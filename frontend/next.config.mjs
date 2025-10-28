import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: false,
	experimental: {
		optimizePackageImports: [
			'@radix-ui/react-dialog',
			'@radix-ui/react-dropdown-menu',
			'@tanstack/react-query',
			'lucide-react',
		],
	},
	webpack: (config) => {
		config.resolve.alias = {
			...(config.resolve.alias || {}),
			'@': path.resolve(process.cwd(), './src'),
		};
		return config;
	},
};

export default nextConfig;
