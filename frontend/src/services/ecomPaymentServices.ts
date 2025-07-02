import axios from "axios"
import CryptoJS from "crypto-js"

// Constants for ECOM API
const ECOM_API_URL = {
  otp: {
    uat: "https://bfluat.in.worldline-solutions.com/wlbflEcomRest/WLECOMRest.svc/InitiateOTP",
    prod: "https://bfl2.in.worldline.com/WLBFLInterfaceECOMREST/WLECOMRest.svc/InitiateOTP",
  },
  requery: {
    uat: "https://bfluat.in.worldline-solutions.com/WorldlineInterfaceEnhanceRequery/WorldlineInterfaceEnhanceRequery.svc/ENQRequest",
    prod: "https://bfl2.in.worldline.com/WorldlineInterfaceEnqRequery/WorldlineInterfaceEnhanceRequery.svc/ENQRequest",
  },
  cancel: {
    uat: "https://bfluat.in.worldline-solutions.com/WLBFLECOMREST/WLECOMRest.svc/CancelledTransaction",
    prod: "https://bfl2.in.worldline.com/WLBFLInterfaceECOMREST/WLECOMRest.svc/CancelledTransaction",
  },
  pod: {
    uat: "https://bfluat.in.worldline-solutions.com/WLBFLECOMREST/WLECOMRest.svc/PODInvoice",
    prod: "https://bfl2.in.worldline.com/WLBFLInterfaceECOMREST/WLECOMRest.svc/PODInvoice",
  },
}

// Environment configuration
const ENVIRONMENT = process.env.NODE_ENV === "production" ? "prod" : "uat"

// Encryption keys and constants
const SECRET_KEYS = {
  otp: process.env.ECOM_OTP_SECRET_KEY || "WWGAPVHYC2110422102233YPM80M36CZ",
  requery: process.env.ECOM_REQUERY_SECRET_KEY || "B0L7iJ2sytuz4iOM2DpK06pkHdhZEV8t",
  cancel: process.env.ECOM_OTP_SECRET_KEY || "WWGAPVHYC2110422102233YPM80M36CZ",
  pod: process.env.ECOM_OTP_SECRET_KEY || "WWGAPVHYC2110422102233YPM80M36CZ",
}

const IV = "1234567887654321"
const SUPPLIER_ID = process.env.ECOM_SUPPLIER_ID || "194"
const DEALER_ID = process.env.ECOM_DEALER_ID || "194"
const VALIDATION_KEY = process.env.ECOM_VALIDATION_KEY || "6384075253966928"

// Types for ECOM API
export interface OTPRequest {
  DEALERID: string
  VALIDATIONKEY: string
  REQUESTID: string
  CARDNUMBER: string
  MOBILENO?: string
  ORDERNO: string
  LOANAMT: string
  Tenure: string
  SchemeId: string
  IPADDR: string
  PIN: string
  PRODDESC?: string
  REQUEST_DATE_TIME: string
  RETURNURL: string
}

export interface OTPResponse {
  RSPCODE: string
  RESPDESC: string
  ORDERNO: string
  RequestID: string
  TENURE: string
  LOANAMT: string
  RESPONSEDATETIME: string
  KFSURL: string
}

export interface ReQueryRequest {
  DEALERID: string
  REQID: string
  VALKEY: string
  REQUERYID: string
  ACQCHNLID: string
}

export interface ReQueryResponse {
  REQID: string
  REQUERYID: string
  RESCODE: string
  ERRDESC: string
  VALKEY: string
  RQTYPE: string
  ENQINFO: any[]
}

export interface CancellationRequest {
  DEALERID: string
  DEALID: string
  LOANAMT: string
  VALIDATIONKEY: string
  ORDERNO: string
  REQUESTID: string
}

export interface CancellationResponse {
  RSPCODE: string
  RESPDESC: string
  REQUESTID: string
  KEY: string
}

/**
 * Service for interacting with the ECOM Payment API
 */
export const EcomPaymentService = {
  /**
   * Encrypt the request payload using AES-256 CBC mode
   * @param payload The request payload to encrypt
   * @param apiType The type of API (otp, requery, cancel, pod)
   * @returns The encrypted payload
   */
  encryptPayload: (payload: any, apiType: "otp" | "requery" | "cancel" | "pod"): string => {
    const jsonString = JSON.stringify(payload)
    const key = CryptoJS.enc.Utf8.parse(SECRET_KEYS[apiType])
    const iv = CryptoJS.enc.Utf8.parse(IV)

    const encrypted = CryptoJS.AES.encrypt(jsonString, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    })

    return encrypted.toString()
  },

  /**
   * Generate the seal value for the request
   * @param encryptedPayload The encrypted payload
   * @param apiType The type of API (otp, requery, cancel, pod)
   * @returns The seal value
   */
  generateSealValue: (encryptedPayload: string, apiType: "otp" | "requery" | "cancel" | "pod"): string => {
    const stringForHash = encryptedPayload + SECRET_KEYS[apiType]
    return CryptoJS.MD5(stringForHash).toString()
  },

  /**
   * Decrypt the response from the API
   * @param encryptedResponse The encrypted response
   * @param apiType The type of API (otp, requery, cancel, pod)
   * @returns The decrypted response
   */
  decryptResponse: (encryptedResponse: string, apiType: "otp" | "requery" | "cancel" | "pod"): any => {
    // Split the response to get the encrypted data and seal value
    const [encryptedData] = encryptedResponse.split("|")

    const key = CryptoJS.enc.Utf8.parse(SECRET_KEYS[apiType])
    const iv = CryptoJS.enc.Utf8.parse(IV)

    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    })

    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8)
    return JSON.parse(decryptedString)
  },

  /**
   * Initiate OTP for EMI Card transaction
   * @param request The OTP request data
   * @returns Promise with the OTP response
   */
  initiateOTP: async (request: OTPRequest): Promise<OTPResponse> => {
    try {
      const encryptedPayload = EcomPaymentService.encryptPayload(request, "otp")
      const sealValue = EcomPaymentService.generateSealValue(encryptedPayload, "otp")

      const response = await axios.post(ECOM_API_URL.otp[ENVIRONMENT], `"${encryptedPayload}"`, {
        headers: {
          "Content-Type": "application/json",
          SealValue: sealValue,
          SupplierID: SUPPLIER_ID,
        },
      })

      return EcomPaymentService.decryptResponse(response.data, "otp")
    } catch (error) {
      console.error("Error initiating OTP:", error)
      throw error
    }
  },

  /**
   * Query the status of a transaction
   * @param request The re-query request data
   * @returns Promise with the re-query response
   */
  reQuery: async (request: ReQueryRequest): Promise<ReQueryResponse> => {
    try {
      const encryptedPayload = EcomPaymentService.encryptPayload(request, "requery")
      const sealValue = EcomPaymentService.generateSealValue(encryptedPayload, "requery")

      const response = await axios.post(ECOM_API_URL.requery[ENVIRONMENT], `"${encryptedPayload}"`, {
        headers: {
          "Content-Type": "application/json",
          SealValue: sealValue,
          SupplierID: SUPPLIER_ID,
        },
      })

      return EcomPaymentService.decryptResponse(response.data, "requery")
    } catch (error) {
      console.error("Error in re-query:", error)
      throw error
    }
  },

  /**
   * Cancel or refund a transaction
   * @param request The cancellation request data
   * @returns Promise with the cancellation response
   */
  cancelTransaction: async (request: CancellationRequest): Promise<CancellationResponse> => {
    try {
      const encryptedPayload = EcomPaymentService.encryptPayload(request, "cancel")
      const sealValue = EcomPaymentService.generateSealValue(encryptedPayload, "cancel")

      const response = await axios.post(ECOM_API_URL.cancel[ENVIRONMENT], `"${encryptedPayload}"`, {
        headers: {
          "Content-Type": "application/json",
          SealValue: sealValue,
          SupplierID: SUPPLIER_ID,
        },
      })

      return EcomPaymentService.decryptResponse(response.data, "cancel")
    } catch (error) {
      console.error("Error cancelling transaction:", error)
      throw error
    }
  },

  /**
   * Generate a unique request ID
   * @param prefix The prefix for the request ID
   * @returns A unique request ID
   */
  generateRequestId: (prefix = "FARECLUBS"): string => {
    const timestamp = new Date().getTime()
    const random = Math.floor(Math.random() * 10000)
    return `${prefix}_${timestamp}_${random}`
  },

  /**
   * Format the current date and time in DDMMYYYYHHMMSS format
   * @returns The formatted date and time
   */
  formatDateTime: (): string => {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, "0")
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const year = now.getFullYear()
    const hours = String(now.getHours()).padStart(2, "0")
    const minutes = String(now.getMinutes()).padStart(2, "0")
    const seconds = String(now.getSeconds()).padStart(2, "0")

    return `${day}${month}${year}${hours}${minutes}${seconds}`
  },
}

export default EcomPaymentService
