package com.psiqueup.api.service;

import com.psiqueup.api.dto.profile.TherapeuticApproachResponse;
import com.psiqueup.api.repository.TherapeuticApproachRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TherapeuticApproachService {

    private final TherapeuticApproachRepository approachRepository;

    @Transactional(readOnly = true)
    public List<TherapeuticApproachResponse> listAll() {
        return approachRepository.findAll().stream()
                .map(TherapeuticApproachResponse::fromEntity)
                .toList();
    }
}