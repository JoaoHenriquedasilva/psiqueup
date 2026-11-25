package com.psiqueup.api.service;

import com.psiqueup.api.domain.entity.PatientProfile;
import com.psiqueup.api.domain.entity.PsychologistProfile;
import com.psiqueup.api.domain.entity.TherapeuticApproach;
import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.domain.enums.UserRole;
import com.psiqueup.api.dto.profile.PatientProfileResponse;
import com.psiqueup.api.dto.profile.PsychologistProfileResponse;
import com.psiqueup.api.dto.profile.UpdatePatientCpfRequest;
import com.psiqueup.api.dto.profile.UpsertPsychologistProfileRequest;
import com.psiqueup.api.repository.PatientProfileRepository;
import com.psiqueup.api.repository.PsychologistProfileRepository;
import com.psiqueup.api.repository.TherapeuticApproachRepository;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.security.CpfCryptoService;
import com.psiqueup.api.util.CpfUtils;
import com.psiqueup.api.util.EmailNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ProfileDomainService {

    private final UserRepository userRepository;
    private final PsychologistProfileRepository psychologistRepository;
    private final PatientProfileRepository patientRepository;
    private final TherapeuticApproachRepository approachRepository;
    private final CpfCryptoService cpfCryptoService;

    private static final String BRAZILIAN_CRP_REGEX = "^(0[1-9]|1[0-9]|2[0-4])/\\d{4,6}$";

    @Transactional
    public PsychologistProfileResponse upsertPsychologistProfile(String email, UpsertPsychologistProfileRequest request) {
        User user = getPsychologistUser(email);

        String normalizedCrp = request.crp().trim().toUpperCase();
        if (!normalizedCrp.matches(BRAZILIAN_CRP_REGEX)) {
            throw new IllegalArgumentException(
                    "Informe um CRP brasileiro válido no formato XX/NNNNN (ex.: 06/12345)."
            );
        }
        PsychologistProfile profile = psychologistRepository.findById(user.getId())
                .orElseGet(() -> PsychologistProfile.builder().user(user).build());

        if ((profile.getCrp() == null || !profile.getCrp().equals(normalizedCrp))
                && psychologistRepository.existsByCrp(normalizedCrp)) {
            throw new IllegalArgumentException("Este CRP já se encontra registado na plataforma.");
        }

        TherapeuticApproach approach = approachRepository.findById(request.approachId())
                .orElseThrow(() -> new IllegalArgumentException("Abordagem terapêutica não encontrada."));

        profile.setCrp(normalizedCrp);
        profile.setApproach(approach);
        profile.setBio(request.bio() != null ? request.bio().trim() : null);

        return PsychologistProfileResponse.fromEntity(psychologistRepository.save(profile));
    }

    @Transactional(readOnly = true)
    public PsychologistProfileResponse getMyPsychologistProfile(String email) {
        User user = getPsychologistUser(email);
        PsychologistProfile profile = psychologistRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Perfil profissional ainda não configurado."
                ));

        return PsychologistProfileResponse.fromEntity(profile);
    }

    @Transactional(readOnly = true)
    public PatientProfileResponse getMyPatientProfile(String email) {
        User user = getPatientUser(email);
        PatientProfile profile = patientRepository.findById(user.getId()).orElse(null);
        return PatientProfileResponse.from(user, profile);
    }

    @Transactional
    public PatientProfileResponse updateMyPatientCpf(String email, UpdatePatientCpfRequest request) {
        User user = getPatientUser(email);
        PatientProfile profile = patientRepository.findById(user.getId())
                .orElseGet(() -> PatientProfile.builder().user(user).build());

        if (profile.getCpfHash() != null && !profile.getCpfHash().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "O CPF já está cadastrado neste perfil e não pode ser alterado diretamente."
            );
        }

        String normalizedCpf = CpfUtils.normalizeAndValidate(request.cpf());
        String cpfHash = cpfCryptoService.hashCpf(normalizedCpf);
        String cpfMasked = CpfUtils.mask(normalizedCpf);

        if (patientRepository.existsByCpfHash(cpfHash)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este CPF já está cadastrado.");
        }

        profile.setCpfHash(cpfHash);
        profile.setCpfMasked(cpfMasked);
        return PatientProfileResponse.from(user, patientRepository.save(profile));
    }

    @Transactional
    public void ensurePatientProfile(String email) {
        User user = getPatientUser(email);

        if (!patientRepository.existsById(user.getId())) {
            patientRepository.save(PatientProfile.builder().user(user).build());
        }
    }

    private User getPatientUser(String email) {
        User user = getUserByEmail(email);
        if (user.getRole() != UserRole.PATIENT) {
            throw new AccessDeniedException("Apenas utilizadores com perfil PATIENT podem gerir o perfil de paciente.");
        }
        return user;
    }

    private User getPsychologistUser(String email) {
        User user = getUserByEmail(email);
        if (user.getRole() != UserRole.PSYCHOLOGIST) {
            throw new AccessDeniedException("Apenas utilizadores com perfil PSYCHOLOGIST podem gerir este perfil.");
        }
        return user;
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(EmailNormalizer.normalize(email))
                .orElseThrow(() -> new UsernameNotFoundException("Utilizador não encontrado."));
    }
}