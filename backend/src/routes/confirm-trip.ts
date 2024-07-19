import 'dayjs/locale/pt-br';
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import nodemailer from 'nodemailer';
import { z } from "zod";
import { dayjs } from "../lib/dayjs";
import { getMailClient } from "../lib/mail";
import { prisma } from "../lib/prisma";
import { ClientError } from '../errors/client-error';
import { env } from '../env';

export async function confirmTrip(app: FastifyInstance){
    app.withTypeProvider<ZodTypeProvider>().get('/trips/:tripId/confirm', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            })
        },
    }, async (request, reply) => {
        const { tripId } = request.params;

        //verificando se o id da viagem confirmada existe na tabela de viagens
        const trip = await prisma.trip.findUnique({
            where: {
                id: tripId,
            },
            //chamando uma segunda consulta para encontrar os participantes da viagem, na mesma query
            include: {
                participants:{
                    where:{
                        is_owner: false,
                    }
                }
            }
        });

        //lança um erro caso o id da viagem não for encontrado
        if (!trip){
            throw new ClientError ('Trip not found');
        }

        if (trip.is_confirmed){
            return reply.redirect(`${env.WEB_BASE_URL}/trips/${tripId}`);
        }

        //caso passar por todas as validações acima, atualiza o status da viagem para confirmada
        await prisma.trip.update({
            where: { id: tripId },
            data: { is_confirmed : true }
        });

        //formatando datas para o email
        const formatedStartDate = dayjs(trip.starts_at).format('LL');
        const formatedEndDate = dayjs(trip.ends_at).format('LL');

        const mail = await getMailClient();  

        /*criando uma Promise de e-mails, ou seja, todos os comandos dessa Promise
        aguardam para serem executados de uma só vez. Sendo que toda função assíncrona retorna uma Promise*/
        await Promise.all(
            //o map, passa por todos elementos (participantes) do array
            trip.participants.map(async(participant) => {
                const confirmationLink = `${env.API_BASE_URL}/${participant.id}/confirm`;
                const message = await mail.sendMail({
                    from:{
                        name: 'Equipe Plann.er',
                        address: 'contato@plann.er',
                    },
                    to: participant.email,
                    subject: `Confirme sua presença na viagem para ${trip.destination} em ${formatedStartDate}`,
                    html: `
                    <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
                        <p>Você foi convidado(a) para participar de uma viagem para <strong>${trip.destination}</strong> nas datas de <strong>${formatedStartDate}</strong> até <strong>${formatedEndDate}</strong>.</p>
                        <p></p>
                        <p>Para confirmar sua presença na viagem, clique no link abaixo:</p>
                        <p></p>
                        <p>
                            <a href="${confirmationLink}">Confirmar presença</a>
                        </p>
                        <p></p>
                        <p>Caso você não saiba do que se trata esse e-mail ou não poderá estar presente, apenas ignore esse e-mail.</p>
                    </div>`
                    .trim()
                });
        
                console.log(nodemailer.getTestMessageUrl(message));
            }),
        );

        //redireciona o usuário para a página da viagem, após a confirmação
        return reply.redirect(`${env.WEB_BASE_URL}/trips/${tripId}`);
    });
}