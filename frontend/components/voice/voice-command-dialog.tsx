"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  AudioLines,
  BarChart3,
  Check,
  Loader2,
  Mic,
  MicOff,
  PackagePlus,
  ReceiptText,
  RotateCcw,
  Volume2,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  type AssistantVoiceResult,
  type InventoryVoiceResult,
  type PosVoiceResult,
  type VoiceCommandResult,
  voiceService,
} from "@/lib/voice-service"

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

const MAX_NO_SPEECH_RETRIES = 4

function getRecognitionErrorMessage(error: string) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone or speech recognition access was blocked. Allow it in the browser site settings, then try again."
    case "audio-capture":
      return "No working microphone was found. Check the selected input device or type the command."
    case "network":
      return "The browser speech service could not be reached. Check your connection or privacy extension, then try again."
    case "language-not-supported":
      return "The selected speech language is not supported by this browser. Choose another language or type the command."
    default:
      return "Voice capture could not continue. Try again or type the command."
  }
}

function getMicrophoneErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : ""

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone access was blocked. Allow microphone access in the browser site settings, then try again."
    case "NotFoundError":
      return "No microphone was found. Connect or enable a microphone, then try again."
    case "NotReadableError":
      return "The microphone is being used by another application. Close that application, then try again."
    default:
      return "The microphone could not be started. Check the browser site settings or type the command."
  }
}

interface VoiceCommandDialogProps {
  mode: "inventory" | "pos" | "assistant"
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply?: (result: VoiceCommandResult) => void | string | Promise<void | string>
}

function getSpokenInterpretation(result: VoiceCommandResult) {
  if (result.mode === "assistant") return result.answer
  if (result.mode === "inventory") {
    return result.missingFields.length > 0
      ? `I understood the product command. ${result.summary}. Please complete ${result.missingFields.join(", ")} before the product is saved.`
      : `I understood the product command. ${result.summary}. Confirm to add the product.`
  }
  const unmatchedCount = result.items.filter((item) => !item.matched).length
  return unmatchedCount > 0
    ? `I understood the point of sale command. ${result.summary}. ${unmatchedCount} requested product${unmatchedCount === 1 ? " was" : "s were"} not matched. Review and confirm the matched items.`
    : `I understood the point of sale command. ${result.summary}. Review and confirm the command.`
}

function getDefaultCompletion(result: VoiceCommandResult) {
  if (result.mode === "inventory") return "The product command was applied."
  if (result.mode === "pos") {
    return result.generateInvoice
      ? "The invoice command was applied."
      : "The products were added to the point of sale cart."
  }
  return result.answer
}

const inventoryLabels: Record<string, string> = {
  name: "Name",
  description: "Description",
  category: "Category",
  subcategory: "Subcategory",
  brand: "Brand",
  price: "Selling price",
  cost: "Cost",
  stock: "Opening stock",
  minStock: "Minimum stock",
  maxStock: "Maximum stock",
  unit: "Unit",
  barcode: "Barcode",
  taxRate: "Tax rate",
  supplier: "Supplier",
  notes: "Notes",
}

export function VoiceCommandDialog({
  mode,
  open,
  onOpenChange,
  onApply,
}: VoiceCommandDialogProps) {
  const [language, setLanguage] = useState("en-US")
  const [transcript, setTranscript] = useState("")
  const [result, setResult] = useState<VoiceCommandResult | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isInterpreting, setIsInterpreting] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [error, setError] = useState("")
  const [speechError, setSpeechError] = useState("")
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const shouldListenRef = useRef(false)
  const hasSpeechRef = useRef(false)
  const completedTranscriptRef = useRef("")
  const currentRecognitionTranscriptRef = useRef("")
  const currentRecognitionHadSpeechRef = useRef(false)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const speechRequestRef = useRef(0)

  const isInventory = mode === "inventory"
  const isAssistant = mode === "assistant"
  const title = isInventory
    ? "Add product by voice"
    : isAssistant
      ? "Ask about your business"
      : "Build invoice by voice"
  const example = isInventory
    ? "Add Miniket rice, category Grocery, price 80, cost 68, stock 25."
    : isAssistant
      ? "What are my paid sales today?"
      : "Add two Miniket rice and one soybean oil, cash payment, pickup, and generate an invoice."

  const stopSpeaking = () => {
    speechRequestRef.current += 1
    audioRef.current?.pause()
    audioRef.current = null
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = null
    setIsSpeaking(false)
  }

  const speak = async (message: string) => {
    stopSpeaking()
    const requestId = speechRequestRef.current
    setSpeechError("")
    setIsSpeaking(true)
    let audio: HTMLAudioElement | null = null

    try {
      const blob = await voiceService.speak(message, language as "en-US" | "bn-BD")
      if (requestId !== speechRequestRef.current) return false

      const audioUrl = URL.createObjectURL(blob)
      audioUrlRef.current = audioUrl
      audio = new Audio(audioUrl)
      audioRef.current = audio
      await new Promise<void>((resolve, reject) => {
        audio!.onended = () => resolve()
        audio!.onpause = () => resolve()
        audio!.onerror = () => reject(new Error("Audio playback failed"))
        audio!.play().catch(reject)
      })
      return true
    } catch (requestError: any) {
      if (requestId === speechRequestRef.current) {
        setSpeechError(
          requestError.response?.data?.message ||
            "The AI-generated spoken reply could not be played.",
        )
      }
      return false
    } finally {
      if (requestId === speechRequestRef.current) {
        if (audioRef.current === audio) audioRef.current = null
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
        audioUrlRef.current = null
        setIsSpeaking(false)
      }
    }
  }

  useEffect(() => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }
    setSpeechSupported(
      Boolean(
        speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition,
      ),
    )

    return () => {
      shouldListenRef.current = false
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      recognitionRef.current?.abort()
      stopSpeaking()
    }
  }, [])

  useEffect(() => {
    if (!open) {
      shouldListenRef.current = false
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      recognitionRef.current?.abort()
      recognitionRef.current = null
      completedTranscriptRef.current = ""
      currentRecognitionTranscriptRef.current = ""
      currentRecognitionHadSpeechRef.current = false
      setIsListening(false)
      stopSpeaking()
    }
  }, [open])

  const resetCommand = () => {
    shouldListenRef.current = false
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    recognitionRef.current?.abort()
    recognitionRef.current = null
    hasSpeechRef.current = false
    completedTranscriptRef.current = ""
    currentRecognitionTranscriptRef.current = ""
    currentRecognitionHadSpeechRef.current = false
    retryCountRef.current = 0
    setTranscript("")
    setResult(null)
    setError("")
    setSpeechError("")
    setIsListening(false)
    stopSpeaking()
  }

  const startListening = async () => {
    setError("")
    setResult(null)

    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }
    const Recognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition

    if (!Recognition) {
      setError("Voice capture is not supported in this browser. Type the command instead.")
      return
    }

    shouldListenRef.current = true
    hasSpeechRef.current = false
    completedTranscriptRef.current = transcript.trim()
    currentRecognitionTranscriptRef.current = ""
    currentRecognitionHadSpeechRef.current = false
    retryCountRef.current = 0
    setIsListening(true)

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
      }
    } catch (microphoneError) {
      shouldListenRef.current = false
      setIsListening(false)
      setError(getMicrophoneErrorMessage(microphoneError))
      return
    }

    const beginRecognition = () => {
      if (!shouldListenRef.current) return

      const recognition = new Recognition()
      currentRecognitionTranscriptRef.current = ""
      currentRecognitionHadSpeechRef.current = false
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = language
      recognition.onresult = (event) => {
        let spokenText = ""
        for (let index = 0; index < event.results.length; index += 1) {
          spokenText += `${event.results[index][0].transcript} `
        }
        const currentTranscript = spokenText.trim()
        if (currentTranscript) {
          hasSpeechRef.current = true
          currentRecognitionHadSpeechRef.current = true
          currentRecognitionTranscriptRef.current = currentTranscript
          const fullTranscript = [
            completedTranscriptRef.current,
            currentTranscript,
          ]
            .filter(Boolean)
            .join(" ")
          setTranscript(fullTranscript)
          setError("")
        }
      }
      recognition.onerror = (event) => {
        if (event.error === "no-speech" || event.error === "aborted") return

        shouldListenRef.current = false
        setError(getRecognitionErrorMessage(event.error))
        setIsListening(false)
      }
      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null
        }

        if (shouldListenRef.current) {
          if (currentRecognitionHadSpeechRef.current) {
            completedTranscriptRef.current = [
              completedTranscriptRef.current,
              currentRecognitionTranscriptRef.current,
            ]
              .filter(Boolean)
              .join(" ")
            retryCountRef.current = 0
          } else {
            retryCountRef.current += 1
          }

          if (retryCountRef.current <= MAX_NO_SPEECH_RETRIES) {
            retryTimerRef.current = setTimeout(() => {
              retryTimerRef.current = null
              beginRecognition()
            }, 350)
            return
          }
        }

        if (shouldListenRef.current) {
          setError(
            hasSpeechRef.current
              ? "Listening paused after an extended silence. Review the command or start listening again to add more details."
              : "No speech was detected. Move closer to the microphone, check the selected input device, and try again.",
          )
        }
        shouldListenRef.current = false
        setIsListening(false)
      }
      recognitionRef.current = recognition

      try {
        recognition.start()
      } catch {
        shouldListenRef.current = false
        recognitionRef.current = null
        setIsListening(false)
        setError("Voice capture is already active or could not be started. Wait a moment, then try again.")
      }
    }

    beginRecognition()
  }

  const stopListening = () => {
    shouldListenRef.current = false
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsListening(false)
  }

  const interpretCommand = async () => {
    if (!transcript.trim()) {
      setError("Say or type a command first.")
      return
    }

    setError("")
    setIsInterpreting(true)
    try {
      const interpreted = await voiceService.interpret(mode as any, transcript.trim())
      setResult(interpreted)
      if (interpreted.action === "unknown") {
        setError("The command did not contain a supported inventory or invoice action.")
      } else {
        void speak(getSpokenInterpretation(interpreted))
      }
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ||
          "The voice command could not be interpreted. Try again.",
      )
    } finally {
      setIsInterpreting(false)
    }
  }

  const applyCommand = async () => {
    if (!result || result.action === "unknown" || !onApply) return
    setIsApplying(true)
    setError("")
    try {
      const completion = await onApply(result)
      await speak(completion || getDefaultCompletion(result))
      onOpenChange(false)
      resetCommand()
    } catch (applyError: any) {
      const message =
        applyError.response?.data?.message ||
        applyError.message ||
        "The command could not be applied."
      setError(message)
      await speak(message)
    } finally {
      setIsApplying(false)
    }
  }

  const posResult = result?.mode === "pos" ? result : null
  const inventoryResult = result?.mode === "inventory" ? result : null
  const assistantResult = result?.mode === "assistant" ? result : null
  const canApply =
    result?.action !== "unknown" &&
    !isAssistant &&
    (inventoryResult?.action === "create_product" ||
      Boolean(posResult?.items.some((item) => item.matched)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-0">
        <div className="border-b bg-gradient-to-r from-emerald-500/10 via-background to-background px-6 py-5">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                {isInventory ? (
                  <PackagePlus className="h-5 w-5" />
                ) : isAssistant ? (
                  <BarChart3 className="h-5 w-5" />
                ) : (
                  <ReceiptText className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-1.5">
                  Speak naturally and pause as needed. Press Stop listening when the command is complete, then review it.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 pb-2">
          <div className="rounded-lg border border-dashed bg-muted/35 p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Try:</span> “{example}”
          </div>

          <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
            <div className="space-y-2">
              <Label htmlFor={`voice-language-${mode}`}>Speech language</Label>
              <Select value={language} onValueChange={setLanguage} disabled={isListening}>
                <SelectTrigger id={`voice-language-${mode}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English</SelectItem>
                  <SelectItem value="bn-BD">Bangla</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`voice-transcript-${mode}`}>Command</Label>
                {isListening && (
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                    </span>
                    Listening
                  </div>
                )}
              </div>
              <Textarea
                id={`voice-transcript-${mode}`}
                value={transcript}
                onChange={(event) => {
                  setTranscript(event.target.value)
                  setResult(null)
                }}
                placeholder="Your spoken command appears here"
                className="min-h-24 resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant={isListening ? "destructive" : "outline"}
              onClick={isListening ? stopListening : startListening}
              className="sm:min-w-36"
              disabled={!speechSupported && !isListening}
            >
              {isListening ? (
                <MicOff className="mr-2 h-4 w-4" />
              ) : (
                <Mic className="mr-2 h-4 w-4" />
              )}
              {isListening ? "Stop listening" : "Start listening"}
            </Button>
            <Button
              type="button"
              onClick={interpretCommand}
              disabled={isListening || isInterpreting || !transcript.trim()}
              className="sm:min-w-40"
            >
              {isInterpreting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <AudioLines className="mr-2 h-4 w-4" />
              )}
              Interpret command
            </Button>
            {(transcript || result) && (
              <Button type="button" variant="ghost" onClick={resetCommand}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>

          {!speechSupported && (
            <p className="text-xs text-muted-foreground">
              This browser does not provide speech recognition. You can still type and interpret a command.
            </p>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && result.action !== "unknown" && (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Volume2 className="h-4 w-4 shrink-0" />
                <span>Spoken replies use an AI-generated voice.</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void speak(getSpokenInterpretation(result))}
                disabled={isSpeaking}
              >
                {isSpeaking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Volume2 className="mr-2 h-4 w-4" />
                )}
                {isSpeaking ? "Speaking" : "Speak reply"}
              </Button>
            </div>
          )}

          {speechError && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {speechError}
            </p>
          )}

          {inventoryResult && inventoryResult.action === "create_product" && (
            <InventoryPreview result={inventoryResult} />
          )}

          {posResult && posResult.action !== "unknown" && (
            <PosPreview result={posResult} />
          )}

          {assistantResult && <AssistantPreview result={assistantResult} />}
        </div>

        <DialogFooter className="border-t bg-muted/25 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {isAssistant ? "Close" : "Cancel"}
          </Button>
          {!isAssistant && (
            <Button type="button" onClick={applyCommand} disabled={!canApply || isApplying}>
              {isApplying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {isInventory
                ? inventoryResult?.missingFields.length
                  ? "Review product"
                  : "Add product"
                : posResult?.generateInvoice
                  ? "Create invoice"
                  : "Apply to POS"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AssistantPreview({ result }: { result: AssistantVoiceResult }) {
  return (
    <div className="overflow-hidden rounded-xl border" aria-live="polite">
      <div className="border-b bg-emerald-500/5 px-4 py-4">
        <div className="flex items-start gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              Business answer
            </p>
            <p className="mt-2 text-base font-medium leading-relaxed">{result.answer}</p>
          </div>
        </div>
      </div>
      {result.metrics.length > 0 && (
        <div className="grid gap-px bg-border sm:grid-cols-3">
          {result.metrics.map((metric) => (
            <div key={metric.label} className="bg-background px-4 py-3">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="mt-1 text-lg font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>
      )}
      {result.items.length > 0 && (
        <div className="divide-y border-t">
          {result.items.map((item) => (
            <div key={`${item.label}-${item.value}`} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="text-right text-muted-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InventoryPreview({ result }: { result: InventoryVoiceResult }) {
  const values = Object.entries(result.product).filter(
    ([key, value]) =>
      key !== "sku" && value !== undefined && value !== null && value !== "",
  )

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Product draft</p>
          <p className="text-xs text-muted-foreground">{result.summary}</p>
        </div>
        <Badge variant="outline">Review required</Badge>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-2">
        {values.map(([key, value]) => (
          <div key={key} className="bg-background px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {inventoryLabels[key] || key}
            </p>
            <p className="mt-0.5 truncate text-sm font-medium">{String(value)}</p>
          </div>
        ))}
      </div>
      {result.missingFields.length > 0 && (
        <div className="border-t px-4 py-3">
          <p className="mb-2 text-xs font-medium text-amber-700 dark:text-amber-300">
            Complete these fields before saving
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.missingFields.map((field) => (
              <Badge key={field} variant="secondary">
                {inventoryLabels[field] || field}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PosPreview({ result }: { result: PosVoiceResult }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-start justify-between gap-3 border-b bg-muted/40 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">POS command preview</p>
          <p className="text-xs text-muted-foreground">{result.summary}</p>
        </div>
        {result.generateInvoice && <Badge>Invoice requested</Badge>}
      </div>
      <div className="divide-y">
        {result.items.map((item, index) => (
          <div key={`${item.requestedName}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {item.productName || item.requestedName}
              </p>
              <p className="text-xs text-muted-foreground">
                Quantity {item.quantity}
                {item.availableStock !== undefined && ` · ${item.availableStock} in stock`}
              </p>
            </div>
            <Badge variant={item.matched ? "outline" : "destructive"}>
              {item.matched ? "Matched" : "Not found"}
            </Badge>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 border-t bg-muted/20 px-4 py-3">
        {result.paymentMethod && (
          <Badge variant="secondary">Payment: {result.paymentMethod}</Badge>
        )}
        {result.deliveryType && (
          <Badge variant="secondary">Fulfilment: {result.deliveryType}</Badge>
        )}
        {result.customerName && (
          <Badge variant="secondary">Customer: {result.customerName}</Badge>
        )}
        {result.customerPhone && (
          <Badge variant="secondary">Phone: {result.customerPhone}</Badge>
        )}
      </div>
    </div>
  )
}
