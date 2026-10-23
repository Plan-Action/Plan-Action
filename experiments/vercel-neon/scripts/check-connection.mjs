import {readProbe} from '../lib/probe.mjs';
try {console.log(JSON.stringify(await readProbe(process.env.DATABASE_URL)));}
catch {console.error('Connection test failed. Check the isolated Neon configuration.'); process.exitCode=1;}
