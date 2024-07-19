import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ClientError } from "../errors/client-error";

export async function getParticipant(app: FastifyInstance){
    /*com a lib zod, possibililita criar esse esquema para configurar
    a solicitação da api*/
    app.withTypeProvider<ZodTypeProvider>().get('/participants/:participantId', {
        schema: {
            params: z.object({
                participantId: z.string().uuid(),
            }),
        },
    }, async (request) => {
        const { participantId } = request.params;

        //busca a viagem dando include nas atividades atreladas
        const participant = await prisma.participant.findUnique({
            where: { id: participantId },
        });

        //validando se a viagem exite
        if (!participant){
            throw new ClientError('Participant not found');
        }

        return { participant };
    })
}