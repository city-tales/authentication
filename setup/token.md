# Steps to Generate JWT Token with ES256 Algorithm

## 1. Generate ECDSA Private and Public Keys

### Generate ECDSA Private Key (P-256 curve)

Use the `openssl` command to generate the private key using the **prime256v1** (P-256 curve):

```
openssl ecparam -name prime256v1 -genkey -out private.pem
```

### Generate the Corresponding Public Key

Use the private key to generate the corresponding public key:

```
openssl ec -in private.pem -pubout -out public.pem
```

## 2. Store the Private Key in `.env` File

Store the private key in `.env` file. Open `.env` file and add the following:

```
JWT_PRIVATE_KEY = "-----BEGIN EC PARAMETERS-----
<your private key content here>
-----END EC PRIVATE KEY-----"
```

Make sure to copy the entire private key (including -----BEGIN EC PRIVATE KEY----- and -----END EC PRIVATE KEY-----) and paste it into the `.env` file.

-----------EXAMPLE------------

```
JWT_PRIVATE_KEY = "-----BEGIN EC PARAMETERS-----
BggqhkjOPQMBBw==
-----END EC PARAMETERS-----
-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIC+elhuilmgrrf07GoIMW9TcTe8qvaQj2aX1PYQEatUSoAoGCCqGSM49
AwEHoUQDQgAEViCm43B/65sTrOe4X3NMxO1pGL4tA0YRisBF0NXbjAVSWGBW3RTh
EAZlS8GwYug71UItb4rCBXL4//cEVITYDA==
-----END EC PRIVATE KEY-----"
```
