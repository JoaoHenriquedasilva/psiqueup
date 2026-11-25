package com.psiqueup.api.security;

import com.psiqueup.api.util.CpfUtils;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
public class CpfCryptoService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final int MIN_PEPPER_BYTES = 32;

    private final String cpfPepper;
    private SecretKeySpec secretKeySpec;

    public CpfCryptoService(@Value("${app.security.cpf-pepper:}") String cpfPepper) {
        this.cpfPepper = cpfPepper;
    }

    @PostConstruct
    void init() {
        if (cpfPepper == null || cpfPepper.isBlank()
                || cpfPepper.getBytes(StandardCharsets.UTF_8).length < MIN_PEPPER_BYTES) {
            throw new IllegalStateException(
                    "A propriedade 'app.security.cpf-pepper' (CPF_PEPPER) deve estar configurada com pelo menos 32 bytes (256 bits)."
            );
        }
        this.secretKeySpec = new SecretKeySpec(cpfPepper.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
    }

    public String hashCpf(String rawCpf) {
        String digits = CpfUtils.normalizeAndValidate(rawCpf);
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(secretKeySpec);
            byte[] hashBytes = mac.doFinal(digits.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException | InvalidKeyException ex) {
            throw new IllegalStateException("Falha ao calcular HMAC-SHA256 do CPF.", ex);
        }
    }
}
