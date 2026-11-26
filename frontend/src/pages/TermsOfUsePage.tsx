import { LegalPageLayout } from '../components/LegalPageLayout';
import { CURRENT_TERMS_VERSION } from '../constants/legal';

export function TermsOfUsePage() {
    return (
        <LegalPageLayout
            title="Termos de Uso"
            subtitle="Regras de utilização, responsabilidades dos perfis e limites operacionais da plataforma PsiqueUp."
            lastUpdated={CURRENT_TERMS_VERSION}
            summaryItems={[
                'O PsiqueUp é uma ferramenta de organização de vínculos e agenda — não substitui atendimento presencial/remoto nem armazena prontuários.',
                'O acesso à conta exige confirmação de e-mail e uso pessoal e intransferível das credenciais.',
                'Psicólogos e consultórios são integralmente responsáveis pela veracidade de CRP, CNPJ e pela conduta ética profissional.',
            ]}
        >
            <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-ink">
                    1. Objeto e escopo administrativo
                </h2>
                <p>
                    O PsiqueUp disponibiliza um ambiente digital para conexão transparente entre
                    pacientes, psicólogos(as) e consultórios, abrangendo exclusivamente fluxos
                    administrativos: gestão de vínculos terapêuticos, agendamento de sessões e
                    registro de status operacionais.
                </p>
                <p>
                    A plataforma <strong>não realiza atendimentos clínicos</strong>, não presta
                    serviços de emergência psicológica e não mantém prontuários ou registros de
                    evolução clínica.
                </p>
            </section>

            <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-ink">
                    2. Cadastro, verificação de e-mail e segurança
                </h2>
                <p>
                    Para utilizar o PsiqueUp, o usuário deve fornecer informações verdadeiras,
                    aceitar expressamente estes Termos e a Política de Privacidade, e concluir a
                    confirmação do endereço de e-mail antes do primeiro acesso.
                </p>
                <p>
                    Cada conta é pessoal e intransferível. O usuário compromete-se a manter sua
                    senha em sigilo e a utilizar o fluxo de recuperação de acesso em caso de
                    suspeita de uso não autorizado.
                </p>
            </section>

            <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-ink">
                    3. Responsabilidades por perfil de acesso
                </h2>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Pacientes:</strong> revisar e aceitar ou recusar solicitações de
                        vínculo terapêutico com autonomia, além de acompanhar seus agendamentos.
                    </li>
                    <li>
                        <strong>Psicólogos(as):</strong> manter registro ativo no Conselho Regional
                        de Psicologia (CRP), apresentar sua abordagem clínica de forma clara e
                        cumprir integralmente o Código de Ética Profissional do Psicólogo.
                    </li>
                    <li>
                        <strong>Consultórios (Admin):</strong> assegurar a regularidade do CNPJ
                        informado, gerenciar aprovações de profissionais vinculados e respeitar os
                        limites administrativos da plataforma.
                    </li>
                </ul>
            </section>

            <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-ink">
                    4. Privacidade e proteção de dados
                </h2>
                <p>
                    O tratamento de dados pessoais realizado na plataforma segue integralmente a
                    nossa Política de Privacidade e a Lei Geral de Proteção de Dados (LGPD),
                    incluindo proteção de CPF por hash criptográfico e ausência de armazenamento de
                    prontuários clínicos.
                </p>
            </section>

            <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-ink">
                    5. Atualizações e contato
                </h2>
                <p>
                    Estes Termos podem ser atualizados para refletir melhorias de segurança,
                    conformidade regulatória ou novos recursos. Em caso de dúvidas ou solicitações,
                    entre em contato pelo canal do Encarregado (DPO) indicado abaixo.
                </p>
            </section>
        </LegalPageLayout>
    );
}
