import Head from "next/head";

export default function Metadata(props) {
	return <Head>
		<title>{props.title || "Thermometer, by Tape"}</title>
		<meta name="description" content={props.description || "A collaborative streaming utility"} />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<link rel="icon" href="/favicon.ico" />

		{props.hasOwnProperty('noIndex') && <meta name="robots" content="noindex" />}
	</Head>
}