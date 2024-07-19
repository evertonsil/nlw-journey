import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ClientError } from "../errors/client-error";

export async function getTripDetails(app: FastifyInstance){
    /*com a lib zod, possibililita criar esse esquema para configurar
    a solicitação da api*/
    app.withTypeProvider<ZodTypeProvider>().get('/trips/:tripId', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            }),
        },
    }, async (request) => {
        const { tripId } = request.params;

        //busca a viagem dando include nas atividades atreladas
        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
        });

        //validando se a viagem exite
        if (!trip){
            throw new ClientError('Trip not found');
        }

        return { trip: trip };
    })
}