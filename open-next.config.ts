import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Sem cache incremental customizado: o app nao usa ISR/generateStaticParams,
// so paginas dinamicas (force-dynamic) e client components.
export default defineCloudflareConfig();
