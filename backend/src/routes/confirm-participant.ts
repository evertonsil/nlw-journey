import 'dayjs/locale/pt-br';
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ClientError } from '../errors/client-error';
import { env } from '../env';

export async function confirmParticipant(app: FastifyInstance){
    app.withTypeProvider<ZodTypeProvider>().get('/participants/:participantId/confirm', {
        schema: {
            params: z.object({
                participantId: z.string().uuid(),
            })
        },
    }, async (request, reply) => {
        const { participantId } = request.params;
        
        //query para consultar o participante
        const participant = await prisma.participant.findUnique({
            where : { id: participantId }
        });

        //validando se participante existe
        if(!participant){
            throw new ClientError ('Participant not found');
        }

        //verifica se o participante já confirmou a presença na viagem
        if (participant.is_confirmed){
            return reply.redirect(`${env.WEB_BASE_URL}/trips/${participant.trip_id}`);
        }

        //caso passar todas as validações sem erro, atualiza o status para confirmado
        await prisma.participant.update({
            where : { id: participantId },
            data: { is_confirmed: true }
        });

        //redireciona o usuário para a página da viagem, após a confirmação
        return reply.redirect(`${env.WEB_BASE_URL}/trips/${participant.trip_id}`);
    });
}