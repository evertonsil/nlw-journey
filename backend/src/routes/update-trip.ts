import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { dayjs } from "../lib/dayjs";
import { ClientError } from "../errors/client-error";

export async function updateTrip(app: FastifyInstance){
    /*com a lib zod, possibililita criar esse esquema para configurar
    a solicitação da api*/
    app.withTypeProvider<ZodTypeProvider>().put('/trips/:tripId', {
        schema: {
            params: z.object({
                tripId: z.string().uuid()
            }),
            //passando os campo que o usuário poderá editar
            body: z.object({
                destination: z.string().min(4),
                //coerce tenta converter o valor para data
                starts_at: z.coerce.date(),
                ends_at: z.coerce.date(),
            })
        },
    }, async (request) => {
        const { tripId } = request.params;
        const { destination, starts_at, ends_at } = request.body;

        const trip = await prisma.trip.findUnique({
            where: { id: tripId }
        })

        if (!trip){
            throw new ClientError ('Trip not found');
        }

        //verifica se a nova data de início da viagem é maior que a data atual
        if (dayjs(starts_at).isBefore(new Date())){
            throw new ClientError ('Invalid trip start date')
        }

        //verifica se a nova data de fim da viagem é maior que a data de início
        if (dayjs(ends_at).isBefore(starts_at)){
            throw new ClientError ('Invalid trip end date');
        }

        //panssando as validações sem erro, executa o update no banco
        await prisma.trip.update({
            where: { id: tripId },
            data: {destination, starts_at, ends_at}
        });

        return { tripId : trip.id}
    })
}