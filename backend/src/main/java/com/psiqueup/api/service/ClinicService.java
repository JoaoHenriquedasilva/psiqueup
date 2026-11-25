package com.psiqueup.api.service;

import com.psiqueup.api.domain.entity.Clinic;
import com.psiqueup.api.domain.entity.ClinicPsychologist;
import com.psiqueup.api.domain.entity.PsychologistProfile;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.ClinicPsychologistStatus;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.dto.clinic.ClinicLinkResponse;
import com.psiqueup.api.dto.clinic.JoinClinicRequest;
import com.psiqueup.api.repository.ClinicPsychologistRepository;
import com.psiqueup.api.repository.ClinicRepository;
import com.psiqueup.api.repository.PsychologistProfileRepository;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.util.CnpjUtils;
import com.psiqueup.api.util.EmailNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ClinicService {

    private final ClinicRepository clinicRepository;
    private final ClinicPsychologistRepository clinicPsychologistRepository;
    private final PsychologistProfileRepository psychologistRepository;
    private final UserRepository userRepository;

    @Transactional
    public ClinicLinkResponse requestClinicJoin(String psychologistEmail, JoinClinicRequest request) {
        User psychologistUser = getActivePsychologistUser(psychologistEmail);

        PsychologistProfile psychologist = psychologistRepository.findById(psychologistUser.getId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Complete seu perfil profissional (CRP) antes de solicitar vínculo a um consultório."
                ));

        String sanitizedCnpj = CnpjUtils.normalizeAndValidate(request.cnpj());
        Clinic clinic = clinicRepository.findByCnpj(sanitizedCnpj)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Consultório não encontrado para o CNPJ informado."
                ));

        if (!Boolean.TRUE.equals(clinic.getActive())) {
            throw new IllegalArgumentException("Este consultório está inativo no momento.");
        }

        Optional<ClinicPsychologist> existingOpt = clinicPsychologistRepository
                .findByClinicIdAndPsychologistUserId(clinic.getId(), psychologist.getUserId());

        if (existingOpt.isPresent()) {
            ClinicPsychologist existing = existingOpt.get();
            if (existing.getStatus() == ClinicPsychologistStatus.PENDING) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Já existe uma solicitação pendente para este consultório."
                );
            }
            if (existing.getStatus() == ClinicPsychologistStatus.APPROVED) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Você já possui vínculo aprovado com este consultório."
                );
            }
        }

        boolean hasOtherActiveOrPending = clinicPsychologistRepository.existsByPsychologistUserIdAndStatusIn(
                psychologist.getUserId(),
                List.of(ClinicPsychologistStatus.PENDING, ClinicPsychologistStatus.APPROVED)
        );
        if (hasOtherActiveOrPending) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Você já possui uma solicitação pendente ou vínculo aprovado com outro consultório."
            );
        }

        if (existingOpt.isPresent()) {
            // Se estava REJECTED, permite nova solicitação atualizando o registro existente
            ClinicPsychologist existing = existingOpt.get();
            existing.setStatus(ClinicPsychologistStatus.PENDING);
            return ClinicLinkResponse.fromEntity(clinicPsychologistRepository.save(existing));
        }

        ClinicPsychologist link = ClinicPsychologist.builder()
                .clinic(clinic)
                .psychologist(psychologist)
                .status(ClinicPsychologistStatus.PENDING)
                .build();

        return ClinicLinkResponse.fromEntity(clinicPsychologistRepository.save(link));
    }

    @Transactional(readOnly = true)
    public List<ClinicLinkResponse> listMyClinicLinks(String psychologistEmail) {
        User psychologistUser = getActivePsychologistUser(psychologistEmail);
        return clinicPsychologistRepository
                .findAllByPsychologistUserIdOrderByCreatedAtDesc(psychologistUser.getId())
                .stream()
                .map(ClinicLinkResponse::fromEntity)
                .toList();
    }

    private User getActivePsychologistUser(String email) {
        User user = userRepository.findByEmail(EmailNormalizer.normalize(email))
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado."));

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new AccessDeniedException("Conta inativa.");
        }

        if (user.getRole() != UserRole.PSYCHOLOGIST) {
            throw new AccessDeniedException("Apenas psicólogos podem gerenciar vínculos com consultórios.");
        }

        return user;
    }
}
