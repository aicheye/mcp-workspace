package middleware

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"fmt"
	"math/big"
)

// jwkToPublicKey converts a JWK to a public key (RSA or EC).
func jwkToPublicKey(k *jwksKey) (interface{}, error) {
	switch k.Kty {
	case "RSA":
		return jwkToRSAPublicKey(k)
	case "EC":
		return jwkToECPublicKey(k)
	default:
		return nil, fmt.Errorf("unsupported key type: %s", k.Kty)
	}
}

// jwkToRSAPublicKey converts a JWK (RSA) to a *rsa.PublicKey.
func jwkToRSAPublicKey(k *jwksKey) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
	if err != nil {
		return nil, fmt.Errorf("failed to decode modulus: %w", err)
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
	if err != nil {
		return nil, fmt.Errorf("failed to decode exponent: %w", err)
	}
	n := new(big.Int).SetBytes(nBytes)
	eBig := new(big.Int).SetBytes(eBytes)
	return &rsa.PublicKey{N: n, E: int(eBig.Int64())}, nil
}

// jwkToECPublicKey converts a JWK (EC) to a *ecdsa.PublicKey.
func jwkToECPublicKey(k *jwksKey) (*ecdsa.PublicKey, error) {
	xBytes, err := base64.RawURLEncoding.DecodeString(k.X)
	if err != nil {
		return nil, fmt.Errorf("failed to decode x: %w", err)
	}
	yBytes, err := base64.RawURLEncoding.DecodeString(k.Y)
	if err != nil {
		return nil, fmt.Errorf("failed to decode y: %w", err)
	}

	var curve elliptic.Curve
	switch k.Crv {
	case "P-256":
		curve = elliptic.P256()
	case "P-384":
		curve = elliptic.P384()
	case "P-521":
		curve = elliptic.P521()
	default:
		return nil, fmt.Errorf("unsupported EC curve: %s", k.Crv)
	}

	return &ecdsa.PublicKey{
		Curve: curve,
		X:     new(big.Int).SetBytes(xBytes),
		Y:     new(big.Int).SetBytes(yBytes),
	}, nil
}
