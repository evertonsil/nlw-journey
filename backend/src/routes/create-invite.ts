import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import nodemailer from 'nodemailer';
import { z } from "zod";
import { dayjs } from "../lib/dayjs";
import { getMailClient } from "../lib/mail";
import { prisma } from "../lib/prisma";
import { ClientError } from "../errors/client-error";
import { env } from "../env";

export async function createInvite(app: FastifyInstance){
    /*com a lib zod, possibililita criar esse esquema para configurar
    a solicitação da api*/
    app.withTypeProvider<ZodTypeProvider>().post('/trips/:tripId/invites', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            }),
            body: z.object({
               email: z.string().email(),
            }),
        },
    }, async (request) => {
        const { tripId } = request.params;
        const { email } = request.body;

        //busca a viagem
        const trip = await prisma.trip.findUnique({
            where: { id: tripId }
        });

        //validando se a viagem exite
        if (!trip){
            throw new ClientError('Trip not found');
        }

        //caso a viagem existir, cria o novo participante
        const participant = await prisma.participant.create({
            data: {
                email,
                trip_id : tripId,
            }
        })

        //dispara o e-mail de convite para o novo participante
        //formatando datas para o email
        const formatedStartDate = dayjs(trip.starts_at).format('LL');
        const formatedEndDate = dayjs(trip.ends_at).format('LL');

        const mail = await getMailClient();  

      
           
           
                const confirmationLink = `${env.API_BASE_URL}/participants/${participant.id}/confirm`;
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

        return { participant : participant.id}
    })
}