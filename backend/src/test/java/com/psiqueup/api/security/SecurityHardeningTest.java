package com.psiqueup.api.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class SecurityHardeningTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    @Qualifier("springSecurityFilterChain")
    private Filter springSecurityFilterChain;

    @Autowired
    private JwtService jwtService;

    private MockMvc mockMvc() {
        return MockMvcBuilders.webAppContextSetup(context)
                .addFilters(springSecurityFilterChain)
                .build();
    }

    @Test
    void shouldRejectAdminSelfRegistration() throws Exception {
        String payload = """
                {
                  "name": "Atacante Admin",
                  "email": "admin-hacker@psiqueup.test",
                  "password": "password123",
                  "role": "ADMIN",
                  "acceptedTerms": true
                }
                """;

        mockMvc().perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void shouldReturn401JsonWhenAccessingProtectedRouteWithoutToken() throws Exception {
        mockMvc().perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.path").value("/api/users/me"));
    }

    @Test
    void shouldReturn401JsonWhenJwtIsInvalid() throws Exception {
        mockMvc().perform(get("/api/users/me")
                        .header("Authorization", "Bearer invalid.jwt.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.path").value("/api/users/me"));
    }

    @Test
    void shouldRejectJwtForDisabledUser() {
        UserDetails activeUser = new User(
                "user@psiqueup.test",
                "hash",
                true,
                true,
                true,
                true,
                List.of(new SimpleGrantedAuthority("ROLE_PATIENT"))
        );
        String token = jwtService.generateToken(activeUser);
        Claims claims = jwtService.extractAllClaims(token);

        UserDetails disabledUser = new User(
                "user@psiqueup.test",
                "hash",
                false,
                true,
                true,
                true,
                List.of(new SimpleGrantedAuthority("ROLE_PATIENT"))
        );

        assertThat(jwtService.isTokenValid(claims, activeUser)).isTrue();
        assertThat(jwtService.isTokenValid(claims, disabledUser)).isFalse();
    }
}
