import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import dayjs from "dayjs";
import { threadId } from "worker_threads";
import { ClientError } from "../errors/client-error";

export async function createActivity(app: FastifyInstance){
    /*com a lib zod, possibililita criar esse esquema para configurar
    a solicitação da api*/
    app.withTypeProvider<ZodTypeProvider>().post('/trips/:tripId/activities', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            }),
            body: z.object({
                title: z.string().min(4),
                //coerce tenta converter o valor para data
                occurs_at: z.coerce.date(),
            }),
        },
    }, async (request) => {
        const { tripId } = request.params;
        const { title, occurs_at: occurs_at } = request.body;

        //busca a viagem
        const trip = await prisma.trip.findUnique({
            where: { id: tripId }
        });

        //validando se a viagem exite
        if (!trip){
            throw new ClientError('Trip not found');
        }

        //validando se a data da atividade está dentro do período da viagem
        if (dayjs(occurs_at).isBefore(trip.starts_at)){
            throw new ClientError('Invalid activity date');
        }

        if (dayjs(occurs_at).isAfter(trip.ends_at)){
            throw new ClientError('Invalid activity date');
        }

        //se passar as validações sem erro, cadastra a atividade
        const activity = await prisma.activity.create({
            data: {
                title,
                occurs_at,
                trip_id: tripId,
            },
        });

        return { activityId : activity.id}
    })
}