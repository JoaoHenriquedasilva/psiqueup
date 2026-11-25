package com.psiqueup.api.dto.auth;

import com.psiqueup.api.validation.Cnpj;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterClinicRequest(
        @NotBlank(message = "O nome do consultório é obrigatório")
        @Size(min = 3, max = 150, message = "O nome do consultório deve ter entre 3 e 150 caracteres")
        String clinicName,

        @NotBlank(message = "O CNPJ é obrigatório")
        @Cnpj
        String cnpj,

        @NotBlank(message = "O nome do administrador é obrigatório")
        @Size(min = 3, max = 120, message = "O nome do administrador deve ter entre 3 e 120 caracteres")
        String adminName,

        @NotBlank(message = "O e-mail do administrador é obrigatório")
        @Email(message = "Formato de e-mail inválido")
        @Size(max = 150, message = "O e-mail deve ter no máximo 150 caracteres")
        String adminEmail,

        @NotBlank(message = "A senha é obrigatória")
        @Size(min = 6, max = 72, message = "A senha deve ter entre 6 e 72 caracteres")
        String password
) {
}
