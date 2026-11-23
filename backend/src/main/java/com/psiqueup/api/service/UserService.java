package com.psiqueup.api.service;

import com.psiqueup.api.domain.entity.User;
import com.psiqueup.api.dto.user.UpdateUserProfileRequest;
import com.psiqueup.api.dto.user.UserProfileResponse;
import com.psiqueup.api.repository.UserRepository;
import com.psiqueup.api.util.EmailNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentUserProfile(String email) {
        User user = findByEmailOrThrow(email);
        return UserProfileResponse.fromEntity(user);
    }

    @Transactional
    public UserProfileResponse updateCurrentUserProfile(String email, UpdateUserProfileRequest request) {
        User user = findByEmailOrThrow(email);
        String trimmedName = request.name().trim();
        if (trimmedName.length() < 3) {
            throw new IllegalArgumentException("O nome deve ter entre 3 e 120 caracteres.");
        }
        user.setName(trimmedName);
        User updatedUser = userRepository.save(user);
        return UserProfileResponse.fromEntity(updatedUser);
    }

    private User findByEmailOrThrow(String email) {
        return userRepository.findByEmail(EmailNormalizer.normalize(email))
                .orElseThrow(() -> new UsernameNotFoundException("Utilizador não encontrado."));
    }
}