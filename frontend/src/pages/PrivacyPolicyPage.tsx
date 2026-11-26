import { LegalPageLayout } from '../components/LegalPageLayout';
import { CURRENT_PRIVACY_VERSION } from '../constants/legal';

export function PrivacyPolicyPage() {
    return (
        <LegalPageLayout
            title="Política de Privacidade"
            subtitle="Como o PsiqueUp coleta, protege e trata seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)."
            lastUpdated={CURRENT_PRIVACY_VERSION}
            summaryItems={[
                'Escopo estritamente administrativo: não armazenamos prontuários, evoluções ou anotações clínicas.',
                'O CPF do paciente é protegido por hash criptográfico irreversível e exibido apenas de forma mascarada.',
                'Você controla seus vínculos terapêuticos e pode exercer seus direitos de titular (Art. 18 da LGPD) a qualquer momento.',
            ]}
        >
            <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-ink">
                    1. Escopo administrativo sem prontuários clínicos
                </h2>
                <p>
                    O PsiqueUp foi projetado sob o princípio de <strong>Privacy by Design</strong>{' '}
                    para apoiar exclusivamente a gestão operacional do acompanhamento terapêutico:
                    cadastro de perfis, solicitação e aceite de vínculos, agendamento de sessões e
                    registro de comparecimento.
                </p>
                <p>
                    <strong>Não coletamos nem armazenamos</strong> prontuários psicológicos, relatos
                    de sessão, diagnósticos ou anotações clínicas sensíveis. O sigilo profissional
                    permanece integralmente preservado sob responsabilidade do(a) psicólogo(a) em
                    seus meios próprios.
                </p>
            </section>

            <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-ink">
                    2. Dados coletados e finalidade
                </h2>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Pacientes:</strong> nome completo, e-mail, senha (armazenada com
                        hash seguro) e CPF para viabilizar convites e vínculos clínicos autorizados.
                    </li>
                    <li>
                        <strong>Psicólogos(as):</strong> nome completo, e-mail, senha, registro
                        profissional (CRP), abordagem terapêutica e biografia profissional opcional.
                    </li>
                    <li>
                        <strong>Consultórios (Admin):</strong> razão social/nome do consultório,
                        CNPJ, nome e e-mail do(a) responsável para gestão da equipe e triagens.
                    </li>
                    <li>
                        <strong>Registros de aceite e segurança:</strong> confirmação de e-mail,
                        data/hora e versão dos Termos de Uso e Política de Privacidade aceitos, além
                        de controles de taxa (rate limiting) contra acessos abusivos.
                    </li>
                </ul>
            </section>

            <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-ink">
                    3. Proteção de CPF por hash criptográfico
                </h2>
                <p>
                    Quando um paciente informa seu CPF, o número completo não é exposto em consultas
                    ou listagens. O sistema gera um <strong>hash criptográfico</strong> com segredo
                    dedicado para permitir a localização segura em convites de vínculo, mantendo
                    apenas uma representação mascarada para conferência visual.
                </p>
            </section>

            <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-ink">
                    4. Compartilhamento e controle de acesso
                </h2>
                <p>
                    Seus dados não são comercializados nem compartilhados com terceiros para fins
                    publicitários. O acesso às informações operacionais é restrito aos participantes
                    do respectivo vínculo terapêutico ou administrativo, mediante autenticação JWT e
                    verificação prévia de e-mail.
                </p>
            </section>

            <section className="space-y-2">
                <h2 className="font-display text-base font-bold text-ink">
                    5. Direitos do titular (LGPD Art. 18)
                </h2>
                <p>
                    Nos termos do artigo 18 da LGPD, você pode solicitar ao nosso Encarregado (DPO):
                </p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Confirmação da existência de tratamento e acesso aos seus dados;</li>
                    <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
                    <li>
                        Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em
                        desconformidade;
                    </li>
                    <li>
                        Portabilidade, informação sobre compartilhamentos e revogação de
                        consentimento, quando aplicável.
                    </li>
                </ul>
            </section>
        </LegalPageLayout>
    );
}
