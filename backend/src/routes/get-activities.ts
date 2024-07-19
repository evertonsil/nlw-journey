import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import dayjs from "dayjs";
import { threadId } from "worker_threads";
import { ClientError } from "../errors/client-error";

export async function getActivities(app: FastifyInstance){
    /*com a lib zod, possibililita criar esse esquema para configurar
    a solicitação da api*/
    app.withTypeProvider<ZodTypeProvider>().get('/trips/:tripId/activities', {
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
            include: { 
                activities:{
                    orderBy:{
                        occurs_at: 'asc',
                    }
                }
            }
        });

        //validando se a viagem exite
        if (!trip){
            throw new ClientError('Trip not found');
        }

        //retornando as atividades filtradas por dia
        const diffInDayBetweenTripStartAndEnd = dayjs(trip.ends_at).diff(trip.starts_at, 'days');

        //criando um array para armazenar a quantidade de dias da viagem
        const activities = Array.from({ length: diffInDayBetweenTripStartAndEnd + 1}).map((_, index) =>{
            const date = dayjs(trip.starts_at).add(index, 'days');
        

            return {
                date: date.toDate(),
                activities: trip.activities.filter(activity =>{
                    return dayjs(activity.occurs_at).isSame(date, 'day');
                })
            }
        });
        return { activities };
    })
}