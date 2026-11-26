package com.psiqueup.api.controller;

import com.psiqueup.api.security.RateLimitingFilter;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "app.security.rate-limit.enabled=true",
        "app.security.rate-limit.max-requests=2",
        "app.security.rate-limit.window-seconds=60"
})
class RateLimitingTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    @Qualifier("springSecurityFilterChain")
    private Filter springSecurityFilterChain;

    @Autowired
    private RateLimitingFilter rateLimitingFilter;

    private MockMvc mockMvc() {
        return MockMvcBuilders.webAppContextSetup(context)
                .addFilters(springSecurityFilterChain)
                .build();
    }

    @Test
    void shouldReturn429WithRetryAfterAndErrorResponseWhenAuthRateLimitExceeded() throws Exception {
        String body = "{\"email\":\"ratelimit@psiqueup.test\"}";
        String clientIp = "198.51.100.77";

        mockMvc().perform(post("/api/auth/forgot-password")
                        .with(req -> {
                            req.setRemoteAddr(clientIp);
                            return req;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isAccepted());

        mockMvc().perform(post("/api/auth/forgot-password")
                        .with(req -> {
                            req.setRemoteAddr(clientIp);
                            return req;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isAccepted());

        mockMvc().perform(post("/api/auth/forgot-password")
                        .with(req -> {
                            req.setRemoteAddr(clientIp);
                            return req;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.error").value("Too Many Requests"))
                .andExpect(jsonPath("$.path").value("/api/auth/forgot-password"));
    }

    @Test
    void shouldIgnoreUntrustedXForwardedForSpoofingInRateLimit() throws Exception {
        String body = "{\"email\":\"spoof@psiqueup.test\"}";
        String realRemoteAddr = "198.51.100.88";

        mockMvc().perform(post("/api/auth/forgot-password")
                        .header("X-Forwarded-For", "203.0.113.1")
                        .with(req -> {
                            req.setRemoteAddr(realRemoteAddr);
                            return req;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isAccepted());

        mockMvc().perform(post("/api/auth/forgot-password")
                        .header("X-Forwarded-For", "203.0.113.2")
                        .with(req -> {
                            req.setRemoteAddr(realRemoteAddr);
                            return req;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isAccepted());

        // Diferente X-Forwarded-For, mesmo remoteAddr -> deve bloquear com 429
        mockMvc().perform(post("/api/auth/forgot-password")
                        .header("X-Forwarded-For", "203.0.113.3")
                        .with(req -> {
                            req.setRemoteAddr(realRemoteAddr);
                            return req;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void shouldNormalizeMatrixParametersInRateLimit() throws Exception {
        assertThat(RateLimitingFilter.stripMatrixParameters("/api/links;x=1")).isEqualTo("/api/links");
        assertThat(RateLimitingFilter.stripMatrixParameters("/api/auth;v=1/login")).isEqualTo("/api/auth/login");

        String clientIp = "198.51.100.99";

        for (String uri : new String[]{"/api/links;x=1", "/api/links;foo=bar"}) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", uri);
            request.setRemoteAddr(clientIp);
            MockHttpServletResponse response = new MockHttpServletResponse();
            rateLimitingFilter.doFilter(request, response, new MockFilterChain());
            assertThat(response.getStatus()).isEqualTo(200);
        }

        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("POST", "/api/links");
        blockedRequest.setRemoteAddr(clientIp);
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        rateLimitingFilter.doFilter(blockedRequest, blockedResponse, new MockFilterChain());
        assertThat(blockedResponse.getStatus()).isEqualTo(429);
    }
}
