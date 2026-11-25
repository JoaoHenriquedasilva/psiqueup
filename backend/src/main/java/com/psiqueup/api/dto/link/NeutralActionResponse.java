package com.psiqueup.api.dto.link;

public record NeutralActionResponse(
        String message
) {
    public static final String LINK_REQUEST_ACCEPTED_MESSAGE =
            "Se o CPF informado estiver elegível na plataforma, a solicitação de vínculo foi registrada para consentimento do paciente.";

    public static NeutralActionResponse linkRequestRegistered() {
        return new NeutralActionResponse(LINK_REQUEST_ACCEPTED_MESSAGE);
    }
}
