"use client"

import { type FormEvent, type ReactNode, useMemo, useState } from "react"
import {
  AlertTriangle,
  Check,
  Clipboard,
  Download,
  ImageIcon,
  Loader2,
  Megaphone,
  ScanLine,
  WandSparkles,
} from "lucide-react"
import PermissionGuardPage from "@/components/permission-guard-page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { PermissionModuleType } from "@/lib/types"
import {
  type GenerateSocialContentData,
  type GeneratedSocialContent,
  type SocialAspectRatio,
  socialContentService,
} from "@/lib/social-content-service"

const initialBrief: GenerateSocialContentData = {
  platform: "facebook",
  goal: "product",
  topic: "",
  offer: "",
  audience: "",
  visualDirection: "",
  tone: "friendly",
  language: "english",
  aspectRatio: "1:1",
  generateImage: true,
}

const ratioClasses: Record<SocialAspectRatio, string> = {
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-video",
}

export default function SocialContentPage() {
  return (
    <PermissionGuardPage module={PermissionModuleType.SETTINGS}>
      <SocialContentStudio />
    </PermissionGuardPage>
  )
}

function SocialContentStudio() {
  const [brief, setBrief] = useState(initialBrief)
  const [generated, setGenerated] = useState<GeneratedSocialContent | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const imageUrl = useMemo(() => {
    if (!generated?.image) return ""
    return `data:${generated.image.mimeType};base64,${generated.image.data}`
  }, [generated])

  const updateBrief = <Key extends keyof GenerateSocialContentData>(
    key: Key,
    value: GenerateSocialContentData[Key],
  ) => setBrief((current) => ({ ...current, [key]: value }))

  const generateContent = async (event: FormEvent) => {
    event.preventDefault()
    if (!brief.topic.trim()) {
      toast.error("Describe the product or campaign first")
      return
    }

    setIsGenerating(true)
    setCopied(false)
    try {
      const result = await socialContentService.generate({
        ...brief,
        topic: brief.topic.trim(),
        offer: brief.offer?.trim() || undefined,
        audience: brief.audience?.trim() || undefined,
        visualDirection: brief.visualDirection?.trim() || undefined,
      })
      setGenerated(result)
      if (result.imageError) {
        toast.warning(result.imageError)
      } else {
        toast.success("Social content generated")
      }
    } catch (error: any) {
      const responseMessage = error.response?.data?.message
      const message = Array.isArray(responseMessage)
        ? responseMessage.join(" ")
        : responseMessage
      toast.error(
        message ||
          (error.code === "ERR_NETWORK"
            ? "The browser could not reach the content service. Confirm the backend is running and check extensions that block local requests."
            : "AI could not generate this campaign"),
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const copyPost = async () => {
    if (!generated) return
    const post = [
      generated.caption,
      generated.callToAction,
      generated.hashtags.join(" "),
    ]
      .filter(Boolean)
      .join("\n\n")
    await navigator.clipboard.writeText(post)
    setCopied(true)
    toast.success("Post copied")
    window.setTimeout(() => setCopied(false), 1800)
  }

  const downloadImage = () => {
    if (!imageUrl || !generated) return
    const extension = generated.image?.mimeType.includes("jpeg") ? "jpg" : "png"
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = `social-${generated.platform}-${Date.now()}.${extension}`
    link.click()
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="mb-6 overflow-hidden rounded-2xl border bg-[#172033] text-white shadow-sm">
        <div className="grid gap-5 px-5 py-6 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-end lg:px-9 lg:py-8">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7AD7C0]">
              <Megaphone className="h-4 w-4" />
              Campaign workbench
            </div>
            <h1 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
              Turn a product idea into a post ready for the feed.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Generate platform-ready copy and a matching social image with your server-side AI configuration.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
              Copy + image
            </Badge>
            <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
              English + Bangla
            </Badge>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(430px,1.18fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/25">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Campaign brief
                </p>
                <CardTitle className="mt-1 text-xl">What should this post achieve?</CardTitle>
              </div>
              <ScanLine className="h-5 w-5 text-[#14866D]" />
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={generateContent} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Platform" htmlFor="platform">
                  <Select value={brief.platform} onValueChange={(value: GenerateSocialContentData["platform"]) => updateBrief("platform", value)}>
                    <SelectTrigger id="platform"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="x">X</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Campaign goal" htmlFor="goal">
                  <Select value={brief.goal} onValueChange={(value: GenerateSocialContentData["goal"]) => updateBrief("goal", value)}>
                    <SelectTrigger id="goal"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">Feature a product</SelectItem>
                      <SelectItem value="promotion">Promote an offer</SelectItem>
                      <SelectItem value="awareness">Build awareness</SelectItem>
                      <SelectItem value="educational">Educate customers</SelectItem>
                      <SelectItem value="seasonal">Seasonal campaign</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Product or campaign" htmlFor="topic" hint="Include the facts the post is allowed to claim.">
                <Textarea
                  id="topic"
                  value={brief.topic}
                  onChange={(event) => updateBrief("topic", event.target.value)}
                  placeholder="Example: Fresh Miniket rice, locally packed in 5 kg bags"
                  className="min-h-28 resize-y"
                  maxLength={500}
                  required
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Offer" htmlFor="offer" hint="Optional">
                  <Input
                    id="offer"
                    value={brief.offer}
                    onChange={(event) => updateBrief("offer", event.target.value)}
                    placeholder="10% off through Friday"
                    maxLength={200}
                  />
                </Field>
                <Field label="Audience" htmlFor="audience" hint="Optional">
                  <Input
                    id="audience"
                    value={brief.audience}
                    onChange={(event) => updateBrief("audience", event.target.value)}
                    placeholder="Families shopping in Dhaka"
                    maxLength={200}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Tone" htmlFor="tone">
                  <Select value={brief.tone} onValueChange={(value: GenerateSocialContentData["tone"]) => updateBrief("tone", value)}>
                    <SelectTrigger id="tone"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="playful">Playful</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Language" htmlFor="language">
                  <Select value={brief.language} onValueChange={(value: GenerateSocialContentData["language"]) => updateBrief("language", value)}>
                    <SelectTrigger id="language"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="bangla">Bangla</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Image shape" htmlFor="aspectRatio">
                  <Select value={brief.aspectRatio} onValueChange={(value: GenerateSocialContentData["aspectRatio"]) => updateBrief("aspectRatio", value)}>
                    <SelectTrigger id="aspectRatio"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">Square 1:1</SelectItem>
                      <SelectItem value="4:5">Portrait 4:5</SelectItem>
                      <SelectItem value="9:16">Story 9:16</SelectItem>
                      <SelectItem value="16:9">Landscape 16:9</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Visual direction" htmlFor="visualDirection" hint="Optional">
                <Textarea
                  id="visualDirection"
                  value={brief.visualDirection}
                  onChange={(event) => updateBrief("visualDirection", event.target.value)}
                  placeholder="Bright market shelf, natural daylight, green packaging, clean Bengali retail aesthetic"
                  className="min-h-20 resize-y"
                  maxLength={500}
                />
              </Field>

              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border bg-muted/20 px-4 py-3">
                <Checkbox
                  checked={brief.generateImage}
                  onCheckedChange={(checked) => updateBrief("generateImage", checked === true)}
                />
                <span>
                  <span className="block text-sm font-medium">Generate a matching image</span>
                  <span className="block text-xs text-muted-foreground">Uses the configured AI image service and may take longer.</span>
                </span>
              </label>

              <Button
                type="submit"
                size="lg"
                disabled={isGenerating}
                className="h-12 w-full bg-[#14866D] text-white hover:bg-[#106D5A]"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <WandSparkles className="mr-2 h-5 w-5" />
                )}
                {isGenerating ? "Building campaign" : "Generate campaign"}
              </Button>
              <p className="text-center text-xs text-muted-foreground" role="status" aria-live="polite">
                {isGenerating ? "Writing the post and rendering the image. Keep this page open." : "Generated content is a draft. Verify every offer and product claim before publishing."}
              </p>
            </form>
          </CardContent>
        </Card>

        <section className="xl:sticky xl:top-6" aria-label="Generated social post preview">
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/25">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Post proof</p>
                  <CardTitle className="mt-1 text-xl">Ready for review</CardTitle>
                </div>
                {generated && (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={copyPost}>
                      {copied ? <Check className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}
                      {copied ? "Copied" : "Copy post"}
                    </Button>
                    {imageUrl && (
                      <Button type="button" size="sm" variant="outline" onClick={downloadImage}>
                        <Download className="mr-2 h-4 w-4" />
                        Image
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {generated ? (
                <div className="space-y-5" aria-live="polite">
                  {generated.imageError && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-medium">Campaign copy is ready without an image</p>
                        <p className="mt-1 text-amber-900/80">{generated.imageError}</p>
                      </div>
                    </div>
                  )}
                  <div className="relative mx-auto w-full max-w-xl p-3">
                    <CropMarks />
                    <div className={`relative overflow-hidden rounded-sm bg-[#172033] shadow-xl ${ratioClasses[generated.aspectRatio]}`}>
                      {imageUrl ? (
                        <img src={imageUrl} alt={`AI-generated ${generated.platform} campaign visual for ${generated.headline}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col justify-end bg-[radial-gradient(circle_at_top_right,_#2A806D_0,_#172033_46%,_#101726_100%)] p-7 text-white">
                          <Megaphone className="mb-auto h-7 w-7 text-[#7AD7C0]" />
                          <p className="max-w-md text-2xl font-semibold leading-tight sm:text-3xl">{generated.headline}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <article className="rounded-xl border bg-background p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <Badge variant="secondary" className="capitalize">{generated.platform}</Badge>
                      <span className="text-xs text-muted-foreground">{generated.aspectRatio}</span>
                    </div>
                    <h2 className="text-lg font-semibold">{generated.headline}</h2>
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-foreground/85">{generated.caption}</p>
                    {generated.callToAction && <p className="mt-3 text-sm font-semibold text-[#14866D]">{generated.callToAction}</p>}
                    <p className="mt-4 text-sm leading-6 text-[#247A8A]">{generated.hashtags.join(" ")}</p>
                  </article>
                </div>
              ) : (
                <div className="flex min-h-[520px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-background shadow-sm">
                    <ImageIcon className="h-6 w-6 text-[#14866D]" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold">Your campaign proof appears here</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    Complete the brief, then generate copy and an optional image sized for the selected platform.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function CropMarks() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[#E9A23B]" />
      <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[#E9A23B]" />
      <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[#E9A23B]" />
      <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[#E9A23B]" />
    </div>
  )
}
