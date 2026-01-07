import crypto from 'crypto'

/**
 * Zoom Webhooks use a Secret Token to verify that the request is from Zoom.
 * For the initial URL validation, Zoom sends an 'endpoint.url_validation' event.
 * We must respond with a JSON payload containing the plainToken and the encryptedToken.
 */
export function verifyZoomWebhook(
    secretToken: string,
    event: string,
    plainToken: string
) {
    if (event === 'endpoint.url_validation') {
        const hash = crypto
            .createHmac('sha256', secretToken)
            .update(plainToken)
            .digest('hex')

        return {
            plainToken: plainToken,
            encryptedToken: hash,
        }
    }

    return null
}

/**
 * Verify the signature of an incoming Zoom webhook.
 * Zoom sends a signature in the 'x-zm-signature' header.
 */
export function verifySignature(
    secretToken: string,
    signature: string,
    timestamp: string,
    body: string
): boolean {
    const message = `v0:${timestamp}:${body}`
    const hash = crypto
        .createHmac('sha256', secretToken)
        .update(message)
        .digest('hex')
    const expectedSignature = `v0=${hash}`

    return signature === expectedSignature
}
