/* =========================================================
   ID / CREDIT CARD DOCUMENT SCANNER
   =========================================================

   Features:

   - Front / Back workflow
   - Unlimited pages
   - Credit card aspect ratio
   - OpenCV edge detection
   - Perspective correction
   - PDF generation
   - Browser-only processing

========================================================= */


/* =========================================================
   STATE
========================================================= */

let pages = [];

let currentPage = {
  front: null,
  back: null
};

let currentSide = "front";

let cameraStream = null;

let usingFrontCamera = false;

let opencvReady = false;


/* =========================================================
   ELEMENTS
========================================================= */

const startScreen =
  document.getElementById(
    "startScreen"
  );

const cameraScreen =
  document.getElementById(
    "cameraScreen"
  );

const previewScreen =
  document.getElementById(
    "previewScreen"
  );

const documentsScreen =
  document.getElementById(
    "documentsScreen"
  );


const startBtn =
  document.getElementById(
    "startBtn"
  );


const video =
  document.getElementById(
    "video"
  );


const captureBtn =
  document.getElementById(
    "captureBtn"
  );

const switchCameraBtn =
  document.getElementById(
    "switchCameraBtn"
  );

const cancelCameraBtn =
  document.getElementById(
    "cancelCameraBtn"
  );


const pageLabel =
  document.getElementById(
    "pageLabel"
  );

const sideLabel =
  document.getElementById(
    "sideLabel"
  );


const instructionTitle =
  document.getElementById(
    "instructionTitle"
  );

const instructionText =
  document.getElementById(
    "instructionText"
  );


const edgeStatus =
  document.getElementById(
    "edgeStatus"
  );


const documentGuide =
  document.getElementById(
    "documentGuide"
  );


const frontPreview =
  document.getElementById(
    "frontPreview"
  );

const backPreview =
  document.getElementById(
    "backPreview"
  );


const retakeFrontBtn =
  document.getElementById(
    "retakeFrontBtn"
  );

const retakeBackBtn =
  document.getElementById(
    "retakeBackBtn"
  );


const addPageBtn =
  document.getElementById(
    "addPageBtn"
  );

const finishBtn =
  document.getElementById(
    "finishBtn"
  );


const pagesList =
  document.getElementById(
    "pagesList"
  );

const pageCount =
  document.getElementById(
    "pageCount"
  );


const addAnotherBtn =
  document.getElementById(
    "addAnotherBtn"
  );

const downloadPdfBtn =
  document.getElementById(
    "downloadPdfBtn"
  );

const clearAllBtn =
  document.getElementById(
    "clearAllBtn"
  );


const captureCanvas =
  document.getElementById(
    "captureCanvas"
  );

const processingCanvas =
  document.getElementById(
    "processingCanvas"
  );


const processingModal =
  document.getElementById(
    "processingModal"
  );

const processingText =
  document.getElementById(
    "processingText"
  );


/* =========================================================
   OPENCV READY
========================================================= */

function checkOpenCV() {

  if (
    typeof cv !== "undefined" &&
    cv.Mat
  ) {

    opencvReady = true;

    edgeStatus.textContent =
      "Edge detection ready";

    return;
  }


  setTimeout(
    checkOpenCV,
    500
  );
}

checkOpenCV();


/* =========================================================
   SCREEN
========================================================= */

function showScreen(screen) {

  [
    startScreen,
    cameraScreen,
    previewScreen,
    documentsScreen

  ].forEach(
    element => {

      element.classList.remove(
        "active"
      );

    }
  );


  screen.classList.add(
    "active"
  );
}


/* =========================================================
   CAMERA
========================================================= */

async function startCamera() {

  stopCamera();


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    alert(
      "Camera is not supported by this browser."
    );

    return;
  }


  try {

    const constraints = {

      audio: false,

      video: {

        facingMode:
          usingFrontCamera
            ? "user"
            : {
                ideal:
                  "environment"
              },

        width: {
          ideal: 1920
        },

        height: {
          ideal: 1080
        },

        frameRate: {
          ideal: 30
        }

      }

    };


    cameraStream =
      await navigator.mediaDevices
        .getUserMedia(
          constraints
        );


    video.srcObject =
      cameraStream;


    await video.play();


    updateCameraUI();

  } catch (error) {

    console.error(error);


    alert(
      "Camera access failed.\n\n" +

      "Please allow camera permission " +

      "and make sure the website is running " +

      "on HTTPS."
    );
  }
}


/* =========================================================
   STOP CAMERA
========================================================= */

function stopCamera() {

  if (!cameraStream) {
    return;
  }


  cameraStream
    .getTracks()
    .forEach(
      track => track.stop()
    );


  cameraStream = null;

  video.srcObject = null;
}


/* =========================================================
   START
========================================================= */

startBtn.addEventListener(
  "click",
  async () => {

    pages = [];

    currentPage = {
      front: null,
      back: null
    };

    currentSide =
      "front";


    showScreen(
      cameraScreen
    );


    updateCameraUI();


    await startCamera();
  }
);


/* =========================================================
   CAMERA UI
========================================================= */

function updateCameraUI() {

  const pageNumber =
    pages.length + 1;


  pageLabel.textContent =
    `Page ${pageNumber}`;


  if (
    currentSide ===
    "front"
  ) {

    sideLabel.textContent =
      "FRONT";

    instructionTitle.textContent =
      "Scan Front";

    instructionText.textContent =
      "Place the entire card inside the frame";

  } else {

    sideLabel.textContent =
      "BACK";

    instructionTitle.textContent =
      "Scan Back";

    instructionText.textContent =
      "Place the entire card inside the frame";
  }
}


/* =========================================================
   SWITCH CAMERA
========================================================= */

switchCameraBtn.addEventListener(
  "click",
  async () => {

    usingFrontCamera =
      !usingFrontCamera;


    await startCamera();
  }
);


/* =========================================================
   CAPTURE
========================================================= */

captureBtn.addEventListener(
  "click",
  capturePhoto
);


async function capturePhoto() {

  if (
    !video.videoWidth
  ) {

    alert(
      "Camera is not ready."
    );

    return;
  }


  showProcessing(
    "Capturing card..."
  );


  try {

    const image =
      await captureAndProcess();


    if (
      currentSide ===
      "front"
    ) {

      currentPage.front =
        image;


      currentSide =
        "back";


      updateCameraUI();


      hideProcessing();


      edgeStatus.textContent =
        "Now scan the Back";


      return;
    }


    if (
      currentSide ===
      "back"
    ) {

      currentPage.back =
        image;


      stopCamera();


      hideProcessing();


      showPreview();
    }

  } catch (error) {

    console.error(error);

    hideProcessing();


    alert(
      "Could not process the card.\n\n" +
      "Please try again."
    );
  }
}


/* =========================================================
   CAPTURE + PROCESS
========================================================= */

async function captureAndProcess() {

  let width =
    video.videoWidth;

  let height =
    video.videoHeight;


  /*
   * Limit huge camera images.
   */

  const maxWidth =
    2200;


  if (
    width > maxWidth
  ) {

    const ratio =
      maxWidth / width;


    width =
      maxWidth;


    height =
      Math.round(
        height * ratio
      );
  }


  captureCanvas.width =
    width;

  captureCanvas.height =
    height;


  const context =
    captureCanvas.getContext(
      "2d",
      {
        willReadFrequently: true
      }
    );


  /*
   * IMPORTANT:

   * If front camera is mirrored,
   * correct the captured image.
   */

  if (
    usingFrontCamera
  ) {

    context.save();

    context.translate(
      width,
      0
    );

    context.scale(
      -1,
      1
    );

  }


  context.drawImage(
    video,
    0,
    0,
    width,
    height
  );


  if (
    usingFrontCamera
  ) {

    context.restore();
  }


  const original =
    captureCanvas.toDataURL(
      "image/jpeg",
      0.94
    );


  /*
   * OpenCV may not be loaded yet.
   */

  if (
    !opencvReady
  ) {

    return original;
  }


  processingText.textContent =
    "Detecting card edges...";


  const processed =
    await detectCard(
      captureCanvas
    );


  /*
   * If detection fails,
   * keep original image.
   */

  return processed ||
    original;
}


/* =========================================================
   DETECT CARD
========================================================= */

async function detectCard(
  canvas
) {

  return new Promise(
    resolve => {

      try {

        const src =
          cv.imread(canvas);


        if (
          !src ||
          src.empty()
        ) {

          resolve(null);

          return;
        }


        /*
         * Smaller processing image
         */

        const maxDimension =
          1400;


        let scale =
          1;


        if (
          Math.max(
            src.cols,
            src.rows
          ) >
          maxDimension
        ) {

          scale =
            maxDimension /
            Math.max(
              src.cols,
              src.rows
            );
        }


        const small =
          new cv.Mat();


        cv.resize(
          src,
          small,
          new cv.Size(
            Math.round(
              src.cols * scale
            ),

            Math.round(
              src.rows * scale
            )
          ),
          0,
          0,
          cv.INTER_AREA
        );


        /*
         * Grayscale
         */

        const gray =
          new cv.Mat();


        cv.cvtColor(
          small,
          gray,
          cv.COLOR_RGBA2GRAY
        );


        /*
         * Blur
         */

        const blurred =
          new cv.Mat();


        cv.GaussianBlur(
          gray,
          blurred,
          new cv.Size(
            5,
            5
          ),
          0
        );


        /*
         * Edges
         */

        const edges =
          new cv.Mat();


        cv.Canny(
          blurred,
          edges,
          60,
          180
        );


        /*
         * Find contours
         */

        const contours =
          new cv.MatVector();


        const hierarchy =
          new cv.Mat();


        cv.findContours(
          edges,
          contours,
          hierarchy,
          cv.RETR_LIST,
          cv.CHAIN_APPROX_SIMPLE
        );


        const imageArea =
          small.cols *
          small.rows;


        let best =
          null;

        let bestScore =
          0;


        /*
         * Credit-card ratio

         * 85.60 / 53.98

         * ≈ 1.586
         */

        const targetRatio =
          1.586;


        for (
          let i = 0;
          i < contours.size();
          i++
        ) {

          const contour =
            contours.get(i);


          const area =
            cv.contourArea(
              contour
            );


          /*
           * Ignore tiny shapes.
           */

          if (
            area <
            imageArea * 0.04
          ) {

            contour.delete();

            continue;
          }


          const perimeter =
            cv.arcLength(
              contour,
              true
            );


          const approx =
            new cv.Mat();


          cv.approxPolyDP(
            contour,
            approx,
            0.025 *
              perimeter,
            true
          );


          if (
            approx.rows === 4
          ) {

            const rect =
              cv.boundingRect(
                approx
              );


            const ratio =
              Math.max(
                rect.width,
                rect.height
              ) /
              Math.min(
                rect.width,
                rect.height
              );


            /*
             * How close to credit card ratio?
             */

            const ratioDifference =
              Math.abs(
                ratio -
                targetRatio
              );


            /*
             * Reject very bad ratios.
             */

            if (
              ratioDifference <
              0.55
            ) {

              const areaRatio =
                area /
                imageArea;


              /*
               * Prefer:

               * - large object
               * - correct ratio
               */

              const ratioScore =
                Math.max(
                  0,
                  1 -
                  ratioDifference /
                  0.55
                );


              const score =
                areaRatio *
                0.65 +

                ratioScore *
                0.35;


              if (
                score >
                bestScore
              ) {

                if (best) {
                  best.delete();
                }


                best =
                  approx;


                bestScore =
                  score;

              } else {

                approx.delete();
              }

            } else {

              approx.delete();
            }

          } else {

            approx.delete();
          }


          contour.delete();
        }


        /*
         * No card found.
         */

        if (
          !best
        ) {

          cleanup(
            src,
            small,
            gray,
            blurred,
            edges,
            contours,
            hierarchy
          );


          documentGuide.classList.remove(
            "detected"
          );


          edgeStatus.textContent =
            "Edges not detected - tap to capture anyway";


          resolve(null);

          return;
        }


        /*
         * Extract corners
         */

        const points =
          getPoints(
            best
          );


        best.delete();


        if (
          points.length !== 4
        ) {

          cleanup(
            src,
            small,
            gray,
            blurred,
            edges,
            contours,
            hierarchy
          );


          resolve(null);

          return;
        }


        /*
         * Convert to original image coordinates
         */

        const originalPoints =
          points.map(
            point => ({
              x:
                point.x /
                scale,

              y:
                point.y /
                scale
            })
          );


        /*
         * Order corners
         */

        const ordered =
          orderPoints(
            originalPoints
          );


        /*
         * Card dimensions
         */

        const width1 =
          distance(
            ordered.br,
            ordered.bl
          );

        const width2 =
          distance(
            ordered.tr,
            ordered.tl
          );


        const detectedWidth =
          Math.max(
            width1,
            width2
          );


        /*
         * Force credit-card
         * aspect ratio.

         * This prevents badly
         * distorted output.
         */

        const outputWidth =
          Math.round(
            detectedWidth
          );


        const outputHeight =
          Math.round(
            outputWidth /
            1.586
          );


        /*
         * Perspective transform
         */

        processingText.textContent =
          "Straightening card...";


        const sourcePoints =
          cv.matFromArray(
            4,
            1,
            cv.CV_32FC2,
            [

              ordered.tl.x,
              ordered.tl.y,

              ordered.tr.x,
              ordered.tr.y,

              ordered.br.x,
              ordered.br.y,

              ordered.bl.x,
              ordered.bl.y

            ]
          );


        const destinationPoints =
          cv.matFromArray(
            4,
            1,
            cv.CV_32FC2,
            [

              0,
              0,

              outputWidth - 1,
              0,

              outputWidth - 1,
              outputHeight - 1,

              0,
              outputHeight - 1

            ]
          );


        const transform =
          cv.getPerspectiveTransform(
            sourcePoints,
            destinationPoints
          );


        const result =
          new cv.Mat();


        cv.warpPerspective(
          src,
          result,
          transform,

          new cv.Size(
            outputWidth,
            outputHeight
          ),

          cv.INTER_LINEAR,

          cv.BORDER_CONSTANT,

          new cv.Scalar()
        );


        /*
         * Show successful detection
         */

        documentGuide.classList.add(
          "detected"
        );


        edgeStatus.textContent =
          "✓ Card detected";


        /*
         * Convert result to image
         */

        cv.imshow(
          processingCanvas,
          result
        );


        const data =
          processingCanvas.toDataURL(
            "image/jpeg",
            0.94
          );


        /*
         * Cleanup
         */

        cleanup(
          src,
          small,
          gray,
          blurred,
          edges,
          contours,
          hierarchy,
          sourcePoints,
          destinationPoints,
          transform,
          result
        );


        resolve(data);

      } catch (error) {

        console.error(
          "Card detection:",
          error
        );


        documentGuide.classList.remove(
          "detected"
        );


        edgeStatus.textContent =
          "Manual capture mode";


        resolve(null);
      }

    }
  );
}


/* =========================================================
   POINTS
========================================================= */

function getPoints(
  contour
) {

  const points = [];


  for (
    let i = 0;
    i < contour.rows;
    i++
  ) {

    points.push({

      x:
        contour.data32S[
          i * 2
        ],

      y:
        contour.data32S[
          i * 2 + 1
        ]

    });

  }


  return points;
}


/* =========================================================
   ORDER POINTS
========================================================= */

function orderPoints(
  points
) {

  const sums =
    points.map(
      p =>
        p.x + p.y
    );


  const differences =
    points.map(
      p =>
        p.x - p.y
    );


  const tlIndex =
    sums.indexOf(
      Math.min(
        ...sums
      )
    );


  const brIndex =
    sums.indexOf(
      Math.max(
        ...sums
      )
    );


  const trIndex =
    differences.indexOf(
      Math.max(
        ...differences
      )
    );


  const blIndex =
    differences.indexOf(
      Math.min(
        ...differences
      )
    );


  return {

    tl:
      points[tlIndex],

    tr:
      points[trIndex],

    br:
      points[brIndex],

    bl:
      points[blIndex]

  };
}


/* =========================================================
   DISTANCE
========================================================= */

function distance(
  a,
  b
) {

  return Math.sqrt(

    Math.pow(
      a.x - b.x,
      2
    )

    +

    Math.pow(
      a.y - b.y,
      2
    )

  );
}


/* =========================================================
   CLEANUP OPENCV
========================================================= */

function cleanup(
  ...objects
) {

  objects.forEach(
    object => {

      if (
        object &&
        typeof object.delete ===
          "function"
      ) {

        try {

          object.delete();

        } catch (_) {}

      }

    }
  );
}


/* =========================================================
   PREVIEW
========================================================= */

function showPreview() {

  const number =
    pages.length + 1;


  document.getElementById(
    "previewTitle"
  ).textContent =
    `Page ${number}`;


  frontPreview.src =
    currentPage.front;


  backPreview.src =
    currentPage.back;


  showScreen(
    previewScreen
  );
}


/* =========================================================
   RETAKE FRONT
========================================================= */

retakeFrontBtn.addEventListener(
  "click",
  async () => {

    currentSide =
      "front";


    updateCameraUI();


    showScreen(
      cameraScreen
    );


    await startCamera();
  }
);


/* =========================================================
   RETAKE BACK
========================================================= */

retakeBackBtn.addEventListener(
  "click",
  async () => {

    currentSide =
      "back";


    updateCameraUI();


    showScreen(
      cameraScreen
    );


    await startCamera();
  }
);


/* =========================================================
   ADD PAGE
========================================================= */

addPageBtn.addEventListener(
  "click",
  async () => {

    if (
      !currentPage.front ||
      !currentPage.back
    ) {

      alert(
        "Both Front and Back are required."
      );

      return;
    }


    pages.push({

      front:
        currentPage.front,

      back:
        currentPage.back

    });


    currentPage = {

      front: null,

      back: null

    };


    currentSide =
      "front";


    updateCameraUI();


    showScreen(
      cameraScreen
    );


    await startCamera();
  }
);


/* =========================================================
   FINISH
========================================================= */

finishBtn.addEventListener(
  "click",
  () => {

    if (
      !currentPage.front ||
      !currentPage.back
    ) {

      alert(
        "Both Front and Back are required."
      );

      return;
    }


    pages.push({

      front:
        currentPage.front,

      back:
        currentPage.back

    });


    currentPage = {

      front: null,

      back: null

    };


    renderPages();


    showScreen(
      documentsScreen
    );
  }
);


/* =========================================================
   RENDER PAGES
========================================================= */

function renderPages() {

  pagesList.innerHTML = "";


  pageCount.textContent =
    `${pages.length} ${
      pages.length === 1
        ? "page"
        : "pages"
    }`;


  pages.forEach(
    (page, index) => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "page-item";


      item.innerHTML = `

        <div class="page-item-header">

          <span>
            Page ${index + 1}
          </span>

          <span>
            Front + Back
          </span>

        </div>


        <div class="page-images">

          <img
            src="${page.front}"
            alt="Front"
          >

          <img
            src="${page.back}"
            alt="Back"
          >

        </div>


        <div class="page-actions">

          <button
            data-action="front"
            data-index="${index}">
            Retake Front
          </button>


          <button
            data-action="back"
            data-index="${index}">
            Retake Back
          </button>


          <button
            data-action="delete"
            data-index="${index}">
            Delete
          </button>

        </div>

      `;


      pagesList.appendChild(
        item
      );
    }
  );
}


/* =========================================================
   PAGE ACTIONS
========================================================= */

pagesList.addEventListener(
  "click",
  async event => {

    const button =
      event.target.closest(
        "button"
      );


    if (!button) {
      return;
    }


    const index =
      Number(
        button.dataset.index
      );


    const action =
      button.dataset.action;


    /*
     * DELETE
     */

    if (
      action ===
      "delete"
    ) {

      pages.splice(
        index,
        1
      );


      renderPages();

      return;
    }


    /*
     * RETAKE FRONT
     */

    if (
      action ===
      "front"
    ) {

      currentPage = {

        front:
          pages[index].front,

        back:
          pages[index].back

      };


      pages.splice(
        index,
        1
      );


      currentSide =
        "front";


      updateCameraUI();


      showScreen(
        cameraScreen
      );


      await startCamera();


      return;
    }


    /*
     * RETAKE BACK
     */

    if (
      action ===
      "back"
    ) {

      currentPage = {

        front:
          pages[index].front,

        back:
          pages[index].back

      };


      pages.splice(
        index,
        1
      );


      currentSide =
        "back";


      updateCameraUI();


      showScreen(
        cameraScreen
      );


      await startCamera();
    }

  }
);


/* =========================================================
   ADD ANOTHER
========================================================= */

addAnotherBtn.addEventListener(
  "click",
  async () => {

    currentPage = {

      front: null,

      back: null

    };


    currentSide =
      "front";


    updateCameraUI();


    showScreen(
      cameraScreen
    );


    await startCamera();
  }
);


/* =========================================================
   CLEAR
========================================================= */

clearAllBtn.addEventListener(
  "click",
  () => {

    if (
      !confirm(
        "Delete all scanned pages?"
      )
    ) {

      return;
    }


    pages = [];


    currentPage = {

      front: null,

      back: null

    };


    renderPages();


    showScreen(
      startScreen
    );
  }
);


/* =========================================================
   CANCEL CAMERA
========================================================= */

cancelCameraBtn.addEventListener(
  "click",
  () => {

    stopCamera();


    if (
      pages.length > 0
    ) {

      renderPages();


      showScreen(
        documentsScreen
      );

    } else {

      showScreen(
        startScreen
      );

    }

  }
);


/* =========================================================
   PDF
========================================================= */

downloadPdfBtn.addEventListener(
  "click",
  generatePDF
);


async function generatePDF() {

  if (
    pages.length === 0
  ) {

    alert(
      "No scanned pages."
    );

    return;
  }


  showProcessing(
    "Creating PDF..."
  );


  try {

    const {
      jsPDF
    } =
      window.jspdf;


    /*
     * A4 portrait.

     * Each PDF page contains:

     * TOP = Front
     * BOTTOM = Back
     */

    const pdf =
      new jsPDF({

        orientation:
          "portrait",

        unit:
          "mm",

        format:
          "a4",

        compress:
          true

      });


    const pageWidth =
      pdf.internal.pageSize.getWidth();


    const pageHeight =
      pdf.internal.pageSize.getHeight();


    const margin =
      10;


    const gap =
      8;


    const labelHeight =
      7;


    const usableWidth =
      pageWidth -
      margin * 2;


    const cardHeight =
      (
        pageHeight -
        margin * 2 -
        gap -
        labelHeight * 2
      ) / 2;


    /*
     * Keep card's
     * credit-card ratio.
     */

    const cardWidth =
      Math.min(
        usableWidth,
        cardHeight *
        1.586
      );


    const x =
      (
        pageWidth -
        cardWidth
      ) / 2;


    for (
      let i = 0;
      i < pages.length;
      i++
    ) {

      processingText.textContent =
        `Creating PDF ${
          i + 1
        } of ${
          pages.length
        }`;


      if (
        i > 0
      ) {

        pdf.addPage(
          "a4",
          "portrait"
        );
      }


      /*
       * FRONT LABEL
       */

      pdf.setFontSize(
        9
      );


      pdf.text(
        `Page ${
          i + 1
        } - FRONT`,
        margin,
        margin + 4
      );


      /*
       * FRONT
       */

      pdf.addImage(

        pages[i].front,

        "JPEG",

        x,

        margin +
        labelHeight,

        cardWidth,

        cardHeight,

        undefined,

        "FAST"

      );


      /*
       * BACK LABEL
       */

      const backY =
        pageHeight / 2 +
        gap / 2;


      pdf.setFontSize(
        9
      );


      pdf.text(
        `Page ${
          i + 1
        } - BACK`,

        margin,

        backY
      );


      /*
       * BACK
       */

      pdf.addImage(

        pages[i].back,

        "JPEG",

        x,

        backY +
        labelHeight,

        cardWidth,

        cardHeight,

        undefined,

        "FAST"

      );

    }


    /*
     * DOWNLOAD
     */

    pdf.save(
      `ID-Card-Scan-${
        getDate()
      }.pdf`
    );


    hideProcessing();

  } catch (error) {

    console.error(error);

    hideProcessing();


    alert(
      "PDF creation failed."
    );
  }
}


/* =========================================================
   DATE
========================================================= */

function getDate() {

  const date =
    new Date();


  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return (
    `${year}-${month}-${day}`
  );
}


/* =========================================================
   PROCESSING
========================================================= */

function showProcessing(
  message
) {

  processingText.textContent =
    message;


  processingModal.classList.add(
    "show"
  );
}


function hideProcessing() {

  processingModal.classList.remove(
    "show"
  );
}


/* =========================================================
   PAGE VISIBILITY
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
      "hidden"
    ) {

      /*
       * Don't leave camera running
       * unnecessarily.
       */
    }

  }
);
