import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { start } from "repl";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer';
import { dayjs } from "../lib/dayjs";
import { ClientError } from "../errors/client-error";
import { env } from "../env";

export async function createTrip(app: FastifyInstance){
    /*com a lib zod, possibililita criar esse esquema para configurar
    a solicitação da api*/
    app.withTypeProvider<ZodTypeProvider>().post('/trips', {
        schema: {
            body: z.object({
                destination: z.string().min(4),
                //coerce tenta converter o valor para data
                starts_at: z.coerce.date(),
                ends_at: z.coerce.date(),
                owner_name: z.string(),
                owner_email: z.string().email(),
                emails_to_invite: z.array(z.string().email()),
            })
        },
    }, async (request) => {
        const { destination, starts_at, ends_at, owner_name, owner_email, emails_to_invite } = request.body;

        //lança um erro se a data de inicio for anterior a data atual
        if (dayjs(starts_at).isBefore(new Date())){
            throw new ClientError('Invalid trip start date');
        }

        if (dayjs(ends_at).isBefore(starts_at)){
            throw new ClientError ('Invalid trip ends date');
        }

        //criando viagem no banco de dados
        const trip = await prisma.trip.create({
            data: {
                destination,
                starts_at,
                ends_at,
                /*cria primeiro participante na mesma query da criação da viagem,
                funciona apenas para tabelas relacionadas*/
                participants: { 
                    createMany: {
                       data: [
                        {
                            name: owner_name,
                            email: owner_email,
                            is_owner: true,
                            is_confirmed: true,
                        },
                        //o "..." se chama spread operator e pega cada uma das posições do array de emails e joga no array data
                        ...emails_to_invite.map(email =>{
                            return { email }
                        }),
                       ],
                    },
                },
            }
        });

        //formatando datas para o email
        const formatedStartDate = dayjs(starts_at).format('LL');
        const formatedEndDate = dayjs(ends_at).format('LL');

        const confirmationLink = `${env.API_BASE_URL}/trips/${trip.id}/confirm`;

        const mail = await getMailClient();

        const message = await mail.sendMail({
            from:{
                name: 'Equipe Plann.er',
                address: 'contato@plann.er',
            },
            to: {
                name: owner_name,
                address: owner_email
            },
            subject: `Confirme sua viagem para ${destination} em ${formatedStartDate}`,
            html: `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
                <p>Você solicitou a criação de uma viagem para <strong>${destination}</strong> nas datas de <strong>${formatedStartDate}</strong> até <strong>${formatedEndDate}</strong>.</p>
                <p></p>
                <p>Para confirmar sua viagem, clique no link abaixo:</p>
                <p></p>
                <p>
                    <a href="${confirmationLink}">Confirmar viagem</a>
                </p>
                <p></p>
                <p>Caso você não saiba do que se trata esse e-mail ou não poderá estar presente, apenas ignore esse e-mail.</p>
            </div>`
            .trim()
        });

        console.log(nodemailer.getTestMessageUrl(message));

        return { tripId : trip.id}
    })
}