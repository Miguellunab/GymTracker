/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "raw.githubusercontent.com",
			},
			{
				protocol: "https",
				hostname: "www.exercise-db.com",
			},
			{
				protocol: "https",
				hostname: "exercisedb.io",
			},
		],
	},
};

module.exports = nextConfig;
