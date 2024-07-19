import { z } from 'zod';

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    API_BASE_URL: z.string().url(),
    WEB_BASE_URL: z.string().url(),
    /*node sempre lê as variáveis de ambiente como string
    por isso usamos o coerce para declarar a porta, dessa forma
    a porta será convertida para number mesmo que seja recebida com string*/
    PORT: z.coerce.number().default(3333),
})

export const env = envSchema.parse(process.env)