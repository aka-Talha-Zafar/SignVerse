

## 1

## Software Requirement Specification
## For
SignVerse
## BSCS
## By


## S#
Name Registration #/Roll #/Section Mobile # E-Mail
## 1.
## Uzair Moazzam
Fa-22/BSCS/203 0301-9465045 fa22-bscs-203@lgu.edu.pk
## 2.
Talha Zafar Fa-22/BSCS/212 0302-0465032 fa22-bscs-212@lgu.edu.pk






Supervised by:
M.Mugees Asif      ___________________ (Signature)











Department of Computer Science
## Lahore Garrison University
## Lahore

## 2

Table of Contents

- Introduction.................................................................................................................... Page# 3-4
1.1 Purpose ........................................................................................................................ 3
1.2 Document Conventions ................................................................................................ 3
1.3 Intended Audience and Reading Suggestions .............................................................. 3
1.4 Product Scope .............................................................................................................. 4
- Overall Description ........................................................................................................ Page# 4-7
2.1 Product Perspective...................................................................................................... 4-5
2.2 Product Functions ........................................................................................................ 5
2.3 User Classes and Characteristics ................................................................................. 5-6
2.4 Operating Environment .............................................................................................. 6
2.5 Design and Implementation Constraints .................................................................... 6
2.6 User Documentation .................................................................................................. 6-7
2.7 Assumptions and Dependencies ................................................................................ 7
- External Interface Requirements .................................................................................. Page# 7-9
3.1 User Interfaces ........................................................................................................... 7-8
3.2 Hardware Interfaces ................................................................................................... 8
3.3 Software Interfaces .................................................................................................... 8-9
3.4 Communications Interfaces ....................................................................................... 9
- System Features ............................................................................................................ Page# 10-13
4.1 Sign-to-Text/Speech Translation ............................................................................... 10-11
4.2 Text-to-Sign Translation ........................................................................................... 11-12
4.3 Interactive Learning Module .................................................................................... 12-13
- Other Nonfunctional Requirements ............................................................................. Page# 13-15
5.1 Performance Requirements ........................................................................................ 13
5.2 Safety Requirements .................................................................................................. 14
5.3 Security Requirements ............................................................................................... 14
5.4 Software Quality Attributes ....................................................................................... 14-15
5.5 Business Rules ........................................................................................................... 15
References ..................................................................................................................................... Page# 15-16



## 3

## 1. Introduction
## 1.1 Purpose
This  Software  Requirements  Specification  (SRS)  document  outlines  both  the  functional  and
nonfunctional  requirements  of  SignVerse,  a  bidirectional  sign  language translation  and  learning
system. The system allows two-way communication between the hearing community and the users
of American Sign Language (ASL) by means of web-based interfaces. This document will be used
to  be  the  main  guide  during  the  system  development,  testing, and  verification  during  the  entire
project  life.  The  SRS  encompasses  all  the  features  of  the  SignVerse  system,  such  as  sign-to-
text/speech translation, text-to-sign translation using the 2D skeleton avatar and an interactive ASL
learning module.

**Revision (April 2026):** Subsequent to the first draft, requirements were reconciled with the
**implemented** SignVerse repository (FastAPI inference host, Vite/React client) and with the
**offline training procedures** consolidated in `Codes_for_training.txt`. Where the text distinguishes
**training** (GPU-oriented Kaggle/notebook jobs) from **inference** (production API and SPA), that
split is normative: components such as **PoseFormer**, **BoneTransformer**, and **BERT
EncoderDecoder** gloss refinement belong to the **text-to-sign training and authoring pipeline** on
How2Sign Holistic features, while the **deployed** text-to-sign path serves **pre-authored keyframes**
from `database.json`. **Sign-to-text** uses a **Conv1D + Transformer** landmark classifier trained on
the **Google ASL Signs** (Kaggle) landmark corpus, **not** a 3D CNN on RGB volumes, and does not
use BERT at inference for English repair.
## 1.2 Document Conventions
This  SRS  document  is  based  on  IEEE  requirements  conventions  in  software  requirements
specification.  The  requirements  are  ranked  as  High,  Medium  and  Low  depending  on  the
importance  to  the  functionality  of  the  system  at  the  core  level.  High  Priority  requirements  are
mandatory requirements that are important in the basic functioning of the system, Medium Priority
requirements are requirements that add value to the system in terms of the capabilities and Low
Priority  requirements  are  those  requirements  that  add value-added  features  to  the  system.  Each
requirement is identified uniquely via the prefix, REQ- and a consecutive number to enable tracing.
The  use  of  technical  language  that  is  unique  to  sign  language  processing,  natural  language
processing,  and  computer  vision  is  constant  throughout  the  document  as  outlined  in  the  project
proposal.
1.3 Intended Audience and Reading Suggestions
This  SRS  document  will  have  a  variety  of  audiences.  The  attention  of  the  developers  and  the
technical  team  should  be  drawn  to  Sections  3  and  4,  which  elaborate  system  interfaces  and
functional  requirements  that  need  to  be implemented. The evaluators  and the  project  supervisor
need to read through the whole document with special reference to the Sections 1, 2, and 5 to get
a clear insight onto the project scope, system overview, and quality requirements. To generate the
right test cases, testers should focus on the functional requirements of Section 4 and nonfunctional
requirements  of  Section  5.  Section  2  should  be  reviewed  by  future  maintainers  in  order  to
understand  the  architecture  of  the  system, and  Section  3,  to  understand  the  specifications  of the
interfaces. It is also suggested that before getting into detailed requirements, it is advisable to read
Section  1  to  provide  project  context,  then  Section  2  to  provide  system  overview  before  doing
subsequent sections of requirements.

## 4



## 1.4 Product Scope
SignVerse  is  a  full-fledged  web  site  that  is  built  to  help  fill  the  communication  gap  that  exists
between  American  Sign  Language  community  and  the  hearing  community.  It  has  bidirectional
translation,  whereby  sign  language  video  can  be  converted  into  grammatically  correct  text  and
voice, and text can be typed into sign language that is shown in a 2D skeleton-based avatar. The
main goal is to facilitate the real-time and two-way communication at the same time and provide
lingual accuracy with the use of sophisticated Natural Language Processing tools. An interactive
learning module is also used in the system to support ASL learning and practice. SignVerse will
help to achieve social inclusion and accessibility to the Deaf and hard-of-hearing community by
overcoming the limitations of the current unidirectional systems which only acknowledge singular
signs, achieving complete sentence-based translation with a correct grammatical frame.
## 2. Overall Description
Structure and Flow Diagram










## 2.1 Product Perspective
SignVerse is an emerging, self-contained web based system that is solving the communication gap
that  is  critical  between  ASL  users  and  the  hearing  community.  The  operating  system  is  an
integrated platform, consisting of three significant modules: **sign language recognition**,
**text-to-sign presentation**, and an **interactive learning** module.

**Inference (deployed product):** Sign-to-text uses **MediaPipe Holistic** on the server to extract
pose and hand landmarks from **JPEG frames** submitted over **HTTPS**. A **PyTorch** classifier
applies a **temporal Conv1D stem**, a **learned CLS token**, **sinusoidal positional encoding**, **TransformerEncoder**
layers, and a **linear head** on **225-dimensional** landmark vectors (**sequence length 64**), with
**wrist-relative** hand normalization and **shoulder-centered** pose normalization—the same
`normalize_landmarks` logic as in training export. English output combines **gloss-to-English
templates** (word mode), **velocity-based segmentation** with **per-segment classification** and
**deduplication** (sentence mode), optional **machine translation** for non-English UI text, and a
client **Non-Semantic Output Refiner (NSOR)** that adjusts only whitespace, capitalization, and
terminal punctuation on the API string. Text-to-sign at inference maps English through **rule-based
`to_asl` glossing** and plays **pre-authored 2D mannequin keyframes** from **`database.json`**
with **ease-in-out interpolation**—without running **PoseFormer** or **BoneTransformer** on each
user request. Third-party **translation / TTS** HTTP endpoints supply multilingual speech where
integrated. The architecture is **client–server**: **React** (Vite, TypeScript) on the client and
**FastAPI** (Uvicorn) on the server.

**Training (offline, `Codes_for_training.txt`):** **Sign-to-text** weights are produced from the
**Google ASL Signs** (Kaggle) competition data: **parquet** sequences are rasterized to **(64, 225)**
`.npy` caches, **wrist-/shoulder-relative** normalized, augmented with **time-stretch**, **Gaussian
noise**, and **random frame masking** (no left–right flip and no post-normalization global scale),
and optimized with **weighted sampling**, **warmup**, and **cosine LR decay** toward a **multiclass
isolated-sign** objective; the network pools the sequence via a **CLS** readout after the encoder.
**Text-to-sign** research and authoring use **How2Sign Holistic** `.npy`
features (MediaPipe layout, ~25 FPS), **`ASLGrammarTransformerV2`** rules, **`transformers`
`EncoderDecoderModel`** instantiated from **BERT-base** encoders for **English → ASL gloss**
refinement, and **PyTorch PoseFormer + BoneTransformer** (causal Transformer encoders with
grouped **Conv1D** temporal heads) to refine stitched **per-gloss pose clips** into smoother **3D
keypoint** streams for evaluation or for building the **keyframe lexicon** consumed at inference.
## 2.2 Product Functions
The major functions of SignVerse include:
The  system  uses  a  web camera  to  record  video  to the  sign language  and  processes  the  video  to
identify entire ASL sentences and produces them in grammatical correct text in English that has
optional output in multi-lingual speech. The system allows the user to type in English text that is
then interpreted by the system to show as signs in ASL via an animated 2D skeleton avatar. The
site  offers  an interactive  learning  module  in  which  the  participants are able  to  study  ASL  signs,
practice signing and feedback regarding their performance. The system uses **MediaPipe** to extract
hand  and  pose  keypoints,  **Conv1D  +  Transformer**  sequence  modeling  on  landmark  vectors  to
classify  signs,  **templates  /  segmentation  /  optional  MT  +  NSOR**  for  readable  English  at
inference,  and  **gloss  rules  +  `database.json`  keyframes**  for  text-to-sign  playback.  **BERT
EncoderDecoder**,  **PoseFormer**,  and  **BoneTransformer**  appear  in  the  **offline
text-to-sign  training  stack**  documented  in  `Codes_for_training.txt`,  not  as  mandatory  runtime
dependencies  for  sign-to-text.  Everything  is  delivered  as  a  single  **React**-based  web  application.
2.3 User Classes and Characteristics
SignVerse serves three primary user classes:
The main user group with full technical command of the sign language but dissimilar degrees of
technology  acquaintances  is Deaf  and  Hard-of-Hearing  ASL  Users.  The  sign-to-text/speech
translation feature that is needed by these users in the process of communication with non-signers
and advantage of the system to interpret full sentences as opposed to individual signs. This is the
user class most important because the system is created with a main aim of serving them with their
communication needs.
Hearing  Non-Signing  Individuals are  the  secondary  category  of  users  that  require  interaction
with the ASL users but are not proficient in the sign language. The main feature that is used by
these users is the text-to-sign translation option, which is used to produce signed replies through
the 2D avatar. The users are diverse in terms of technical skills and education level but need an
easy to use interface to communicate.
The  third  user  group  is ASL  Learners,  who  are  people  who  are  interested  in  studying  the
American  Sign  Language.  These  are  the  users  who  actively  participate  in  interactive  learning

## 6

module to be educated and practice. This category of user is between a beginner who may have no
previous  experience  with  sign  language  and  intermediate  learner  who  wants  to  sharpen  his/her
skills.
## 2.4 Operating Environments
SignVerse is a web based undertaking which can be accessed by normal web browsers. The system
needs a standard laptop or desktop computer with an inbuilt or external video capture webcam that
supports the sign language. The client-side application is based on the React.js framework and can
be supported by the modern web browsers with the support of HTML5, CSS3 and JavaScript ES6.
The AI processing models in the backend are based on **Python** with **PyTorch** for shipped
inference; **TensorFlow** is not required for the deployed API. **Hugging Face Transformers** is used
in the **offline** BERT encoder–decoder gloss pipeline. **NVIDIA**-class GPUs are **recommended for
training** and optional for self-hosted inference; the public **Hugging Face Space** runs **CPU**
inference with acceptable interactive latency.
The  system  needs  constant  internet  connection  to  access  the  web  application  and  other  text-to-
speech API services. The platform is developed to work with normal operating systems such as
windows, macos and Linux versions.
2.5 Design and Implementation Constraits
There are a few factors that limit the development of the system. **Sign-to-text** recognition is
trained from the **Google ASL Signs** landmark corpus (Kaggle); **text-to-sign** motion research and
gloss-conditioned pose refinement use **How2Sign Holistic** `.npy` features and related CSV
metadata as described in `Codes_for_training.txt`. **Vocabulary coverage** at runtime is bounded by
the **bundled classifier label map** and the **`database.json`** gloss inventory. The project uses
**MediaPipe Holistic**, **OpenCV** for decode/resize, **PyTorch** for sequence and image models, and
**Hugging Face Transformers** where the BERT encoder–decoder gloss model is trained—not for BERT
inference on sign-to-text output. **PoseFormer** and **BoneTransformer** are **training-time** modules
for the How2Sign-based pose pipeline; the **production** avatar path may use **exported keyframes**
instead. The frontend **SHALL** use **React** (Vite + TypeScript as implemented); the primary AI host
**SHALL** be **FastAPI**. The system needs to be able to run inside of the computational and
memory constraints of a typical consumer grade hardware with acceptable real time performance.
The development process has a time limit that is dictated by the academic year 2025/2026 through
the Gantt chart and has a time span of between the months of October 2025 and May 2026. Firebase
is  assigned  to  the  management  of  data  and  services.  Text-to-speech  feature  should  not  be
developed but instead an external API should be integrated. This system should follow the iterative
prototyping approach  whereby  a  single component  has  to  be  tested  and  refined  first  before it  is
integrated.
## 2.6 User Documentation
An elaborate user manual with the system functionality, description of features and step-by-step
guide  to  sign-to-text  translation,  text-to-sign  translation  and  how  to  use  the  learning  modules.
Online assistance running as part of the web application that gives context-sensitive instructions
and tooltips to features of the system and interface items. Technical documentation such as system
architecture diagrams, component descriptions and integration specifications on how to build and
maintain a system. A total project documentation package including the requirement specification
document,  system  architecture  document,  test  reports  including  performance  measures,  and

## 7

deployment documentation. Tutorials integrated in the learning module to assist people in learning
exercises and practice of ASL.
2.7 Assumptions and Dependencies
The  project  presupposes  that  the  users  will  have  the  access  to  the  devices  with  the  working
webcams that will be capable of recording the video with the appropriate resolution and frame rate
to  recognize  the  sign  language.  **Recognition**  quality  tracks  the  **ASL  Signs**  training
distribution; **How2Sign**  remains  the  reference  for  **holistic  pose  features**  in  the  **text-to-sign
training**  stack.  The  system  relies  on  the  presence  and  further  functioning  of  external  text-to-speech API
services  as  a  multi-lingual  speech  output  functionality.  The  project  will  also  presuppose  the
presence  of  stable  internet  connectivity  among  those  users  who  will  be  using  the  web-based
platform and communication between frontend and back-end parts of the project. It relies on the
effective incorporation of several other third-party libraries and frameworks such as MediaPipe,
TensorFlow or PyTorch, React.js, or Firebase. The system performance will rely on the computing
ability of the deployment server, specifically. GPU availability to support the inference of the AI
models effectively. The project presupposes the users as having the minimum computer literacy
and the minimum skills of using web browsers. The deliverables and timeline will be reliant on
the  academic  calendar  and  milestone  schedule,  and  any  delays  might  impact  on  the  following
phases of the project.
## 3. External Interface Requirements
## 3.1 User Interfaces
SignVerse is a web-based graphical user interface that is created with React.js. The interface will
be designed into separate sections that will reflect the three main functions of the system namely,
sign-to-text/speech translation, text-to-sign translation and interactive learning module.
The sign-to-text translation interface has a live web camera feed on which users play ASL signs.
**MediaPipe** runs **server-side** on submitted frames; **live keypoint overlays** on the preview are
**optional** and not required for core operation. Under the
video  view,  the  system  will  give  the  output  of  the  translation in a  readable text  box,  and it  has
something that can be used to activate the speech output in various languages. The interface has
the same position of the buttons to start and stop video capturing.
Text-to-sign translation interface has a text input area which is entered by users with sentences in
English.  When  it  is  submitted,  the  system  shows  a  2D  skeleton  based  avatar  that  gives  the
respective ASL signs in an animation viewer. There are playback controls that enable the users to
pause, replay and change the speed of the animation.
The  learning  module  interface  is  a  structured  catalog  of  ASL  signs  with interactive exercises  in
practicing those signs. The interface shows information about progress tracking and reports about
user performance. Breadcrumb navigation and intuitive menus make navigation between various
signs and the lessons easy.

## 8

The  design  conventions  of  all  interface  screens  are  based  on  a  standard  set  of  buttons  and
navigation interfaces. The error messages are provided on specific locations and in plain languages
that are easy to understand. The interface is user-friendly, meaning that it is readable and it is easy
to use by various classes of users.
## 3.2 Hardware Interfaces
Webcam Interface: This system needs an external or a standard built-in web camera to capture the
sign  language  video  input.  The  webcam  should  be  able  to  meet  minimum  requirements  in
resolution and frame rate needed to use MediaPipe in pose estimation and hand keypoint detection.
The system uses the APIs of the standard web browsers, that is, the WebRTC getUserMedia API,
to  access  the  webcam.  The  video  information  is  recorded  in  real-time  and  transmitted  to  the
processing  units  at  the  back  end.  The  interface also  supports  standard  webcams  with  USB
connection and embedded laptop cameras.
GPU  Interface: To  develop,  train and  run  self-hosted  inference  at  lowest  latency  the  system  may
interface  with  graphics  processing  units  of  NVIDIA  RTX  series  or  equivalent.  CUDA  accelerates
**PyTorch**  training  and  batch  jobs  (ASL  Signs  classifier;  How2Sign  PoseFormer  /  BoneTransformer).
Public  **CPU**  deployment  remains  supported.  Although  GPU  acceleration  is  recommended  for
training,  the  system  is  compatible  with  CPU-only  environments  for  end-users  of  the  hosted  API.
## 3.3 Software Interfaces
SignVerse system communicates with several software and library software:
MediaPipe  Framework: MediaPipe  **Holistic**  is  integrated  on  the  **server**  as  pose  and  hand
keypoint  extraction  from  decoded  **RGB**  frames.  Landmarks  feed  the  **Conv1D  +  Transformer**
classifier  and  sentence  segmentation  logic.
PyTorch  Framework: **PyTorch**  loads  **`.pt`**  checkpoints,  runs  **Conv1D  +  TransformerEncoder**
inference  for  sign-to-text,  and  serves  the  **alphabet  CNN**  in  the  learning  module.  **Training**
scripts  additionally  define  **PoseFormer**  and  **BoneTransformer**  as  `torch.nn.Module`  stacks.
Hugging  Face  Transformers:  **`transformers`  `EncoderDecoderModel`**  with  **`BertTokenizer`**
supports  the  **offline  English→ASL  gloss**  refinement  stage  in  `Codes_for_training.txt`;  it  is  **not**
used  to  post-edit  sign-to-text  English  in  the  shipped  FastAPI  path.
Keyframe  database: **`database.json`**  maps  **ASL  glosses**  to  **ordered  2D  mannequin  frames**  for
text-to-sign  playback  in  the  product.

## 9

React.Js  Framework: The  frontend app  is  developed  on  **React**  with  **Vite**  and  **TypeScript**  as
implemented.  React  communicates  with  the  backend  through  **HTTPS  JSON  REST**  (`/api/*`).
Node.js  Runtime: **Node.js**  is  used  for  **local  Vite  dev/build**  and  an  **optional  Express**  demo
auth  service;  **model  inference**  is  **not**  hosted  on  Node  in  the  primary  deployment.
Firebase   Services: The   system   gives   the   backend   services   using   Firebase   such   as   user
authentication, data storage, and real-time database capabilities. Firebase APIs are applied in the
storage of user progress within the learning module and state management in the application.
Text-to-Speech API: The system is also connected to the external text-to-speech API services that
transform  translated  text  into  the  speech  output  of  various  languages.  The  interface  transfers
textual messages and language options and gets audio back to play using the web browser.
How2Sign  Holistic  features:  Used  in  **text-to-sign  training  /  authoring**  (`Codes_for_training.txt`)  as
**`.npy`**  clips  aligned  to  sentence  metadata.  **Google  ASL  Signs**  (Kaggle  parquet)  supplies  **isolated-sign**
sequences  for  **sign-to-text**  classifier  training.  **pandas**,  **NumPy**,  and  **sacrebleu**/**NLTK**  appear  in
training  utilities  as  recorded  in  the  same  artifact.
## 3.4 Communications Interfaces
SignVerse system needs the following communication interfaces:
HTTP/  HTTPS  Protocol: The  web  app  interacts  with  the  services  in  the  back-end  through  the
standard HTTP and HTTPS protocols. The security and privacy of the data are guaranteed by the
encryption  of all  client-server communication  with the  help  of  HTTPS.  RESTful  API  endpoints
are used to communicate the **FastAPI** backend services with the React frontend services.
**Frame batch transport:** Sign-to-text sends **sampled JPEG** frames in **JSON POST** bodies—not a
persistent **WebSocket** video channel (WebSocket remains an optional future enhancement).
API  Communication:  This  system  uses  the  standard  HTTP  requests  to interact  with the external
text-to-speech  APIs,  transmitting  the  text  and  language-related  parameters  and  receiving  audio
data. Communication with the API of the chosen text-to-speech service provider is based on the
protocols and data standards of the selected service provider.
Browser-Webcam Communication: The frontend application uses the WebRTC APIs available in
the  Web  browser  of  the  user, and  creates  a  secure  connection  with  the  user  webcam to  capture
video and have the necessary user permissions.
Network  Requirements: The  system  needs  to  be  connected  to  a  stable  internet  that  has  enough
bandwidth  to  support  **batched  HTTPS**  uploads  of  short  recordings,  API  calls,  and  **audio**
fetch/playback  for  TTS.  The  system  will  address
ordinary conditions of residential and institutional network.

## 10

## 4. System Features
4.1 Sign-to-Text/Speech Translation
4.1.1 Description and Priority
Sign-to-Text/Speech  Translation  feature  also  allows  users  to  make  Signs  before  a  web  camera
which  the  system  picks  up,  interprets  and  converts  into **readable**  English  text
with  optional  Multi-lingual  speech.  This  capability  is  of  High  priority  since  it  is  one  of  the  two
fundamental  bidirectional  translation  features  that  make  SignVerse  stand  out  among  available
unidirectional systems. The feature solves the root cause of the communication barrier in that ASL
users can pass on full but meaningful sentences to non-signing people.
4.1.2 Stimulus/Response Sequences
The sign-to-text translation mode is activated via the web interface by user. The system triggers
the webcam and the live video stream is shown. The user signs using ASL in front of the camera
and  **sampled  JPEG  frames**  are  captured  and  **POSTed**  to  the  server.  The  backend  decodes  and
resizes  frames,  extracts  **MediaPipe  Holistic**  landmarks,  applies  **wrist-/shoulder-relative**
normalization,  and  runs  the  **Conv1D  +  Transformer**  classifier.  **Word  mode**  maps  the  top  gloss  to
a  **template  English**  sentence;  **sentence  mode**  **segments**  the  recording,  classifies  each  segment,
**deduplicates**  consecutive  identical  signs,  and  **formats**  a  line  of  English.  The  client  may  apply
**NSOR**  for  capitalization  and  punctuation  only.  The  finished  content  is  presented  in  the  text  section
on the interface. User is able to choose a speech output language. The system transmits the text to
the text-to-speech API and plays the audio about it in a browser.
## 4.1.3 Functional Requirements
REQ-1: The system will be able to receive the video input at a rate that will provide an accurate
sign language recognition, which requires the user to have a webcam.
REQ-2:  The  system  will  make  use  of  MediaPipe  to  match  hand  keypoints  and  pose  estimation
information on one video frame.
REQ-3: The system will run the keypoint data that is extracted through **temporal Conv1D and
TransformerEncoder** models on **fixed-length landmark sequences** to identify ASL sign sequences.
REQ-4: The system will be able to read whole signed sentences as opposed to individual signs.
REQ-5:  This  system  will  use  **linguistic  post-processing**—**template  English**  in  word  mode,
**segmentation  and  light  formatting**  in  sentence  mode,  **optional  machine  translation**  for
non-English  display,  and  a  **Non-Semantic  Output  Refiner  (NSOR)**  on  the  client—to  present
polished  English  **without**  changing  content-bearing  tokens.  **BERT  EncoderDecoder**  gloss
refinement  applies  to  the  **offline  text-to-sign  training  stack**  (`Codes_for_training.txt`),  **not**  to
sign-to-text  inference.
REQ-6: The system will show the translated text in an output area of the user interface.
REQ-7:  The  system  will  offer  a  choice  where  users  can  have  the  translated  text  outputed  in the
form of speech.

## 11

REQ-8:  The  system  will  have  the  option  to add  multi-lingual  speech  output  by  connecting  with
text-to-speech API services.
REQ-9:  The  system  will  deal  with  the  ASL  grammatical  structure  such as  the  spatial  grammar,
facial expression, and word arrangement which are different with those of the spoken English.
REQ-10:  The  system  **may**  be  equipped  with  visual  feedback  in  the  form  of  MediaPipe  keypoint
overlays  on  the  video  feed;  **server-side**  landmark  extraction  is  **mandatory**,  overlays  are
**optional**.
REQ-11:  The  system  will  take  the  video  sign  language  to  create  **context-aware**  text  output
within  the  limits  of  **landmark-only**  models,  **template/corpus**  coverage,  and  **segmentation**
quality—**without**  relying  on  a  large  language  model  rewrite  at  inference.
REQ-12: The system will retain recognition accuracy consistent with **ASL Signs–trained** classifier
checkpoints  and  the  **shipped  vocabulary**;  **How2Sign**  is  the  reference  corpus  for  **holistic  pose**
in  **text-to-sign  training**,  not  the  sole  source  of  **sign-to-text**  weights.
4.2 Text-to-Sign Translation
4.2.1 Description and Priority
The Text-to-Sign Translation feature enables one to write English text sentences, which the service
understands and presents the same signs in ASL using an animated 2D skeleton-based avatar. This
is  a  High  priority  feature  because  it  finalizes  the  two-way communication  functionality,  which
allows hearing non-signers to create signed responses to ASL users. This aspect directly fills the
gap in the research presented in current unidirectional systems which do not generate signs.
4.2.2 Stimulus/Response Sequences
User clicks on the text-to-sign translator. User types in an English sentence in the text input field.
Text is  sent  to the  server. The  system  applies  **rule-based  English→ASL  glossing**,  resolves  **gloss
tokens**  against  **`database.json`**,  and  **interpolates**  between  stored  **2D  mannequin**  keyframes.
**Offline**,  **PoseFormer  +  BoneTransformer**  on  **How2Sign  Holistic**  clips  refine  **3D**  pose
trajectories  for  authoring  or  export;  that  stack  is  documented  in  `Codes_for_training.txt`.  The
animation  appears  in  the  visualization  section  of  the  interface.  The
user is able to play the animation and stop and replay the animation and speed control.
## 4.2.3 Functional Requirements
REQ-13: The system will also have a text input feature where users will be required to type English
sentences.
REQ-14:  The  system  will  read  the  input  text  and  identify  the  sequence  of  the  ASL  signs
accompanied by it,  using  **`to_asl`  rules**  and  **lexicon  keys**;  **offline**  stages  may  additionally  use
**`ASLGrammarTransformerV2`**  and  **BERT  EncoderDecoder**  gloss  refinement  as  documented  in
`Codes_for_training.txt`.
REQ-15: **Training:** The system will use **PyTorch PoseFormer** and **BoneTransformer** (causal
Transformer encoders with grouped Conv1D heads) on **How2Sign Holistic** features to refine
**3D** pose clips for gloss sequences. **Inference:** The product will animate **2D skeleton** frames from
**`database.json`** (keyframes typically produced or curated via that training stack).
REQ-16: The system should give a 2-dimensional skeleton-based avatar which visually carries out
the generated ASL signs.

## 12

REQ-17: This system will show the animation of the avatar in a special visualization section of
the user interface.
REQ-18: The system will have playback controls, which enable the end user to pause, rewind, and
respread the pace of the avatar animation.
REQ-19: Sign sequences generated by the system will reflect the semantics of the input text.
REQ-20: The system will contain the transformation of grammar structure of the English language
to a suitable order and conventions of the ASL signing language,  implemented  as  **rule-based
`to_asl`  heuristics**  at  inference  and  **grammar  transformer  +  BERT  gloss  refinement**  in  the
**offline**  text-to-sign  training  pipeline.
REQ-21: The system can generate the smooth and natural-looking animations of the avatars, which
will clearly communicate each sign.
REQ-22: The system would be able to accept text input and render textual sign visualization within
reasonable interactive latency.
## 4.3 Interactive Learning Module
4.3.1 Description and Priority
Interactive  Learning  Module  offers  users  a  well  organized  ASL  learning  material,  drill  practice
and  performance  feedback  to  enable  students  to  develop  language  abilities  on  their  own.  The
priority of this feature is Medium because it makes the platform more educational and fills the gap
that was identified in integrated learning resources. Although it is not necessary to enable the most
fundamental translation  functionality,  this  module  greatly enhances  the  value  proposition  of the
system because it can help develop skills in a long-term.
4.3.2 Stimulus/Response Sequences
Learning module is accessed by the user into the main navigation menu. The system offers a list
of accessible ASL signs and lessons based on their level of difficulty or subject. The user picks a
particular  sign  or  lesson.  The  system  illustrates  teaching  content  on  how  the  chosen  sign  is
performed.  User enters  practice  mode  where  he/she  tries  to  do  the  sign.  The  system  records the
signing  in  of  the  user  via  the  web camera.  The  system  examines  the  performance captured  and
compares  it  to  the  proper  performance  of  the  sign.  The  system  gives  the  user  feedback  about
whether  it  is  accurate  or  where  improvement  is  required.  The  system  monitors  and  shows  the
progress of the user in different practice sessions. User is able to navigate among various signs and
lessons to keep learning.
## 4.3.3 Functional Requirements
REQ-23: The system will include a well-organized database of available signs in the ASL that can
be learned.
REQ-24:  The  system  will  introduce  the  learning  material  showing  how  each  sign  of  the  ASL
language is performed correctly.

## 13

REQ-25: The system will provide a practice mode that is interactive where users should have the
ability to practice learned signs.
REQ-26: The system will record the attempts of user signing in using the webcam during practice.
REQ-27: The system will examine the practice attempts it captures and contrast them with correct
signing.
REQ-28:  The  system  will  ensure  that  the  users  have  the  feedback  on  their  performance  with
regards to signing and this will show the accuracy and suggest a better performance.
REQ-29:  The  system  will  be  able  to  monitor  the  progress  of  the  user  through  various  practice
sessions and learning activities.
REQ-30: The system will provide the information about the progress of the user, indicating what
lessons are done and what are the levels of proficiency.
REQ-31:The  system  will enable the  user  to  move  in  and  out  of  various  signs  and lessons  in the
learning module.
REQ-32:  The  system  will  be  structured to  show  the learning  materials  in a  systematic  way  that
would enable gradual acquisition of skills.
REQ-33: The system will incorporate the learning capability in the unified web-based application
as well as translation functionality.
## 5. Other Nonfunctional Requirements
## 5.1 Performance Requirements
The system will accept sign language video as input and give text translation output in real-time
with  a  latency  that  is  no  greater  than  tolerable  conversational  latencies  to  facilitate  natural
communication. **Sign-to-text** accuracy is governed by **ASL Signs–trained** checkpoints; **text-to-sign**
smoothness  is  governed  by  **keyframe  density**  and  **interpolation**.  The  animations  will  be
generated using text-to-sign avatars that will be smooth and without conspicuous lag and stuttering
that would ruin the understanding of the sign. The system will process and capture video at a rate
high enough to have proper temporal sequence analysis by **landmark Conv1D + Transformer**
models. The
web  application  will  open  and  be  interactive  within  reasonable  time  spans  using  standard
broadband   internet  connections.   The   processing   elements   on   the   back-end   will   use  the
computational resources deployed efficiently, and also in cases where they exist, the processing
time will be considerably shortened through the use of a GPU acceleration. The learning module
will  be  able  to  offer  instant  feedback  on  practice  attempts  to  keep  the  users  interested.  All  the
components of the system will be compatible with an efficient functionality on standard consumer-
grade hardware as indicated in the section of operating environment.

## 14

## 5.2 Safety Requirements
The system will put in place the necessary protective measures to avoid damages of the users when
the system is in operation. The webcam capture will only be enabled upon user request and give
visual  cues  when  recording  is  in  progress  to  avoid  unintentional  infringements  of  privacy.  The
system will not archive or propagate video recordings without user permission processing video
information in real-time and discarding frames after analysis unless actively saved by the user. The
feedback mechanisms used in the learning module will offer constructive feedback that will not
result in frustration and discouragement on the part of the user that may result to frustration and
consequently lead to the abandonment of trying language learning. The system will also deal with
the errors in a graceful manner and will also be equipped with error messages and error safe modes
which will not cause data loss or system failures. The avatar visualisation will not contain images
or motion pictures that might be erroneously construed as offensive and culturally inappropriate
symbols.
## 5.3 Security Requirements
The  system  will  also  have  the  HTTPS  encryption  on  all client-server  communications  to  secure
the transmission of data. Authentication of users and managing of their sessions will be done safely
using  Firebase  authentication  services  with  relevant  password policies  and  also  against  typical
vulnerabilities.  The  system  will  not  hold  the  sensitive  user  information  other  than  that  being
required in functionality and progress tracking. The permission to access Webcams shall be asked
and  allowed  under  normal  browser  security.  To  avoid  injection  attacks  or  malicious  codes,  the
system will authenticate and cleanse all user-related input including text and uploaded information.
The backend AI models and processing services will only be accessible to authorized application
components  by  using  appropriate  authentication  and  authorization  mechanisms.  Firebase  will
ensure  that  user  learning  progress  and  personal  data  are  stored  in  a  safe  manner  with  necessary
access controls. The system will be in accordance with applicable data protection and privacy laws
that have an impact on educational technology and assistive communication devices.
## 5.4 Software Quality Attributes
Reliability: The  system  will  be  able  to  perform  in  a manner  of  constant  performance in  various
usage sessions where the sign recognition and translation functions will give consistent results to
similar inputs. The system will manage the unforeseen inputs or system state without crashing or
going into undefined states.
Usability: The user interface will be friendly and user-friendly with a low level of technical skills
needed to use it with minimal training to operate it at the basic level. The interface design will be
similar in all the features of the system. The error messages and feedbacks will be written in clear
and user-friendly language.

## 15

Maintainability: The  system  architecture  will  be  prepared  to  be  modular  and  distinctly  divided
frontend, backend and AI model parts are to ensure this is done with ease to update and improve
it as time goes. Code will be highly documented, thus, enabling developers not involved in initial
development to maintain it.
Portability: The  web-based  app  will  be  compatible  with  the  leading  web  browsers  used  in  the
contemporary world such as Chrome, Firefox, Safari, and Edge. The system will work on various
operating systems such as windows, MacOS, and Linux without any platform-related adjustments.
Precision: the translation outputs will be correct representations of the intended meaning of
sign language input **within model, template, and lexicon limits**; semantic fidelity is **not** guaranteed
by **BERT** at **sign-to-text** inference. **Offline BERT EncoderDecoder** supports **English→gloss** in the
text-to-sign **training** stack. The text-
to-sign avatar will provide an accurate reflection of the text in the proper ASL signing conventions
**where `database.json` and `to_asl` rules cover the input**.
Testability: Design components will be made testable and the module interfaces will be made clear
to  allow  unit  testability,  integration  testability  and  system  validation.  The  system  will  have
objective performance measures on accuracy and latency to be evaluated.
## 5.5 Business Rules
The system will only translate sign language through the convention of American Sign Language
(ASL) since the **recognition vocabulary** derives from **ASL Signs** training and **text-to-sign** assets
are **ASL-oriented** (How2Sign holistic features in training; `database.json` at inference). The learning
module will be based on the ASL linguistic principles and cultural norms of presenting the ASL
signs. The system will first put the emphasis on the full sentence-level translation, as opposed to
individual  word  recognition,  to  facilitate  the  meaningful  communication,  as  opposed  to  the
fragmented  communication.  The  text-to-sign  translation  will  be  modified  to  conform  English
grammatical  arrangement  to  fit  the  correct  ASL  signing  arrangement  to  preserve  linguistic
correctness  as  opposed  to  resulting  in  word-per-word  signed  English.  The  system  will  be  freely
available to translation and learning without the tiered services to users via the web interface in
line with the aim of the project of enhancing social inclusion and access. The data on user progress
and learning will belong to individual users and will have privacy protection provided by security
requirements.
## References

[1] “A real-time CNN and LSTM-based SLR system for isolated signs,” Sensors, vol. 25, no. 7,
Art. no. 2138, 2025. [Online]. Available:
https://www.mdpi.com/1424-8220/25/7/2138

[2] F. Khan et al., “Sign language recognition using MediaPipe and LSTM,” International Journal
of  Research  in  Programming  and  Robotics  (IJRPR),  vol.  6,  no.  4,  2023.  [Online].  Available:
https://ijrpr.com/uploads/V6ISSUE4/IJRPR41472.pdf


## 16

[3] A. Kumar et al., “SLRNet: A real-time LSTM-based sign language recognition system,” 2024.
[Online]. Available:
https://www.researchgate.net/publication/392716727_SLRNet_A_Real-Time_LSTM-
Based_Sign_Language_Recognition_System

[4] F. Khan et al., “SLRNet: A real-time LSTM-based sign language recognition system,” 2024.
[Online]. Available:
https://discovery.researcher.life/download/article/feaf24376a7435fba7259046f9f734b3/full-text

[5] R. Gaikwad, “Sign language recognition of words and sentence prediction using LSTM and
NLP,” 2024. [Online]. Available:
https://www.researchgate.net/publication/388439260_SIGN_LANGUAGE_RECOGNITION_O
## F_WORDS_AND_SENTENCE_PREDICTION_USING_LSTM_AND_NLP

[6] SignVerse consolidated offline training and authoring scripts: `Codes_for_training.txt` (text-to-sign:
How2Sign Holistic pipeline with **ASLGrammarTransformerV2**, **BERT EncoderDecoder**, **PoseFormer**,
**BoneTransformer**; sign-to-text: **Google ASL Signs** parquet to wrist-relative **(64×225)** features,
**Conv1D + Transformer** v5 training recipe).