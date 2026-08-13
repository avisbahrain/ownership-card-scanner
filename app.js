/* =========================================================
   DOCUMENT SCANNER
   Front + Back
   Unlimited Pages
   Edge Detection
   Perspective Correction
   PDF Export
   ========================================================= */


/* ---------------------------------------------------------
   STATE
--------------------------------------------------------- */

let pages = [];

let currentPage = {
  front: null,
  back: null
};

let currentSide = "front";

let cameraStream = null;
let usingFrontCamera = false;

let opencvReady = false;


/* ---------------------------------------------------------
   ELEMENTS
--------------------------------------------------------- */

const startScreen = document.getElementById("startScreen");
const cameraScreen = document.getElementById("cameraScreen");
const previewScreen = document.getElementById("previewScreen");
const documentsScreen = document.getElementById("documentsScreen");

const startBtn = document.getElementById("startBtn");

const video = document.getElementById("video");

const captureBtn = document.getElementById("captureBtn");
const switchCameraBtn = document.getElementById("switchCameraBtn");
const cancelCameraBtn = document.getElementById("cancelCameraBtn");

const pageLabel = document.getElementById("pageLabel");
const sideLabel = document.getElementById("sideLabel");

const frontPreview = document.getElementById("frontPreview");
const backPreview = document.getElementById("backPreview");

const retakeFrontBtn = document.getElementById("retakeFrontBtn");
const retakeBackBtn = document.getElementById("retakeBackBtn");

const addPageBtn = document.getElementById("addPageBtn");
const finishBtn = document.getElementById("finishBtn");

const pagesList = document.getElementById("pagesList");
const pageCount = document.getElementById("pageCount");

const addAnotherBtn = document.getElementById("addAnotherBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

const captureCanvas = document.getElementById("captureCanvas");
const processingCanvas = document.getElementById("processingCanvas");

const processingModal = document.getElementById("processingModal");
const processingText = document.getElementById("processingText");

const edgeStatus = document.getElementById("edgeStatus");


/* ---------------------------------------------------------
   OPENCV
--------------------------------------------------------- */

function checkOpenCV() {

  if (
    typeof cv !== "undefined" &&
    cv.Mat
  ) {
    opencvReady = true;

    edgeStatus.textContent =
      "Document detection ready";

    return;
  }

  setTimeout(checkOpenCV, 500);
}

checkOpenCV();


/* ---------------------------------------------------------
   SCREEN CONTROL
--------------------------------------------------------- */

function showScreen(screen) {

  [
    startScreen,
    cameraScreen,
    previewScreen,
    documentsScreen
  ].forEach(s => {
    s.classList.remove("active");
  });

  screen.classList.add("active");
}


/* ---------------------------------------------------------
   CAMERA
--------------------------------------------------------- */

async function startCamera() {

  stopCamera();

  try {

    cameraStream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: usingFrontCamera
            ? "user"
            : {
                ideal: "environment"
              },

          width: {
            ideal: 1920
          },

          height: {
            ideal: 1080
          }
        },

        audio: false
      });

    video.srcObject = cameraStream;

    await video.play();

  } catch (error) {

    console.error(error);

    alert(
      "Unable to access the camera.\n\n" +
      "Please allow camera permission and make sure " +
      "the website is running on HTTPS."
    );
  }
}


function stopCamera() {

  if (!cameraStream) {
    return;
  }

  cameraStream
    .getTracks()
    .forEach(track => track.stop());

  cameraStream = null;

  video.srcObject = null;
}


/* ---------------------------------------------------------
   CAMERA SWITCH
--------------------------------------------------------- */

switchCameraBtn.addEventListener(
  "click",
  async () => {

    usingFrontCamera = !usingFrontCamera;

    await startCamera();
  }
);


/* ---------------------------------------------------------
   START SCANNING
--------------------------------------------------------- */

startBtn.addEventListener(
  "click",
  async () => {

    pages = [];

    currentPage = {
      front: null,
      back: null
    };

    currentSide = "front";

    updateCameraLabels();

    showScreen(cameraScreen);

    await startCamera();
  }
);


/* ---------------------------------------------------------
   CAMERA LABELS
--------------------------------------------------------- */

function updateCameraLabels() {

  const pageNumber =
    pages.length + 1;

  pageLabel.textContent =
    `Page ${pageNumber}`;

  sideLabel.textContent =
    currentSide === "front"
      ? "Front"
      : "Back";

}


/* ---------------------------------------------------------
   CAPTURE
--------------------------------------------------------- */

captureBtn.addEventListener(
  "click",
  capturePhoto
);


async function capturePhoto() {

  if (!video.videoWidth) {

    alert("Camera is not ready yet.");

    return;
  }

  showProcessing(
    "Capturing document..."
  );

  try {

    const image =
      await captureAndProcess();

    if (currentSide === "front") {

      currentPage.front = image;

      currentSide = "back";

      updateCameraLabels();

      hideProcessing();

      edgeStatus.textContent =
        "Now capture the Back";

      return;
    }


    if (currentSide === "back") {

      currentPage.back = image;

      stopCamera();

      hideProcessing();

      showPagePreview();
    }

  } catch (error) {

    console.error(error);

    hideProcessing();

    alert(
      "Unable to process the image. " +
      "Please try again."
    );
  }
}


/* ---------------------------------------------------------
   CAPTURE IMAGE
--------------------------------------------------------- */

async function captureAndProcess() {

  const maxWidth = 2000;

  let width =
    video.videoWidth;

  let height =
    video.videoHeight;


  if (width > maxWidth) {

    const ratio =
      maxWidth / width;

    width = maxWidth;

    height =
      Math.round(height * ratio);
  }


  captureCanvas.width =
    width;

  captureCanvas.height =
    height;


  const ctx =
    captureCanvas.getContext(
      "2d",
      {
        willReadFrequently: true
      }
    );


  ctx.drawImage(
    video,
    0,
    0,
    width,
    height
  );


  const source =
    captureCanvas.toDataURL(
      "image/jpeg",
      0.92
    );


  /*
   * Try automatic document detection.
   *
   * If OpenCV cannot find a good rectangle,
   * return the original photo.
   */

  if (!opencvReady) {

    return source;
  }


  processingText.textContent =
    "Detecting document edges...";


  const processed =
    await detectAndCropDocument(
      captureCanvas
    );


  return processed || source;
}


/* ---------------------------------------------------------
   DOCUMENT DETECTION
--------------------------------------------------------- */

async function detectAndCropDocument(canvas) {

  return new Promise(resolve => {

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
       * Resize for faster processing.
       */

      const maxDimension = 1200;

      let scale = 1;

      if (
        Math.max(
          src.cols,
          src.rows
        ) > maxDimension
      ) {

        scale =
          maxDimension /
          Math.max(
            src.cols,
            src.rows
          );
      }


      let small =
        new cv.Mat();

      cv.resize(
        src,
        small,
        new cv.Size(
          Math.round(src.cols * scale),
          Math.round(src.rows * scale)
        ),
        0,
        0,
        cv.INTER_AREA
      );


      let gray =
        new cv.Mat();

      let blur =
        new cv.Mat();

      let edges =
        new cv.Mat();


      cv.cvtColor(
        small,
        gray,
        cv.COLOR_RGBA2GRAY
      );


      cv.GaussianBlur(
        gray,
        blur,
        new cv.Size(5, 5),
        0
      );


      cv.Canny(
        blur,
        edges,
        75,
        200
      );


      let contours =
        new cv.MatVector();

      let hierarchy =
        new cv.Mat();


      cv.findContours(
        edges,
        contours,
        hierarchy,
        cv.RETR_LIST,
        cv.CHAIN_APPROX_SIMPLE
      );


      let bestContour = null;

      let bestArea = 0;

      const imageArea =
        small.cols *
        small.rows;


      for (
        let i = 0;
        i < contours.size();
        i++
      ) {

        const contour =
          contours.get(i);

        const area =
          cv.contourArea(contour);


        if (
          area <
          imageArea * 0.15
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
          0.02 * perimeter,
          true
        );


        if (
          approx.rows === 4 &&
          area > bestArea
        ) {

          if (bestContour) {

            bestContour.delete();
          }

          bestContour =
            approx;

          bestArea =
            area;

        } else {

          approx.delete();
        }


        contour.delete();
      }


      if (!bestContour) {

        cleanup(
          src,
          small,
          gray,
          blur,
          edges,
          contours,
          hierarchy
        );

        resolve(null);

        return;
      }


      processingText.textContent =
        "Straightening document...";


      const points =
        getContourPoints(
          bestContour
        );


      bestContour.delete();


      if (
        !points ||
        points.length !== 4
      ) {

        cleanup(
          src,
          small,
          gray,
          blur,
          edges,
          contours,
          hierarchy
        );

        resolve(null);

        return;
      }


      /*
       * Convert points back to
       * original image coordinates.
       */

      const originalPoints =
        points.map(point => ({
          x: point.x / scale,
          y: point.y / scale
        }));


      const ordered =
        orderPoints(
          originalPoints
        );


      const widthA =
        distance(
          ordered.br,
          ordered.bl
        );

      const widthB =
        distance(
          ordered.tr,
          ordered.tl
        );

      const maxWidth =
        Math.max(
          widthA,
          widthB
        );


      const heightA =
        distance(
          ordered.tr,
          ordered.br
        );

      const heightB =
        distance(
          ordered.tl,
          ordered.bl
        );

      const maxHeight =
        Math.max(
          heightA,
          heightB
        );


      const outputWidth =
        Math.round(maxWidth);

      const outputHeight =
        Math.round(maxHeight);


      if (
        outputWidth < 200 ||
        outputHeight < 200
      ) {

        cleanup(
          src,
          small,
          gray,
          blur,
          edges,
          contours,
          hierarchy
        );

        resolve(null);

        return;
      }


      /*
       * Perspective transformation.
       */

      const srcPoints =
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


      const dstPoints =
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
          srcPoints,
          dstPoints
        );


      const dst =
        new cv.Mat();


      cv.warpPerspective(
        src,
        dst,
        transform,
        new cv.Size(
          outputWidth,
          outputHeight
        ),
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar()
      );


      cv.imshow(
        processingCanvas,
        dst
      );


      const result =
        processingCanvas.toDataURL(
          "image/jpeg",
          0.92
        );


      srcPoints.delete();
      dstPoints.delete();
      transform.delete();
      dst.delete();


      cleanup(
        src,
        small,
        gray,
        blur,
        edges,
        contours,
        hierarchy
      );


      resolve(result);

    } catch (error) {

      console.error(
        "Edge detection error:",
        error
      );

      resolve(null);
    }

  });
}


/* ---------------------------------------------------------
   OPENCV HELPERS
--------------------------------------------------------- */

function getContourPoints(contour) {

  const points = [];

  for (
    let i = 0;
    i < contour.rows;
    i++
  ) {

    points.push({
      x: contour.data32S[i * 2],
      y: contour.data32S[i * 2 + 1]
    });
  }

  return points;
}


function orderPoints(points) {

  const sortedBySum =
    [...points].sort(
      (a, b) =>
        (a.x + a.y) -
        (b.x + b.y)
    );


  const tl =
    sortedBySum[0];

  const br =
    sortedBySum[3];


  const sortedByDifference =
    [...points].sort(
      (a, b) =>
        (a.x - a.y) -
        (b.x - b.y)
    );


  const tr =
    sortedByDifference[3];

  const bl =
    sortedByDifference[0];


  return {
    tl,
    tr,
    br,
    bl
  };
}


function distance(a, b) {

  return Math.sqrt(
    Math.pow(
      a.x - b.x,
      2
    ) +
    Math.pow(
      a.y - b.y,
      2
    )
  );
}


function cleanup(...objects) {

  objects.forEach(obj => {

    if (
      obj &&
      typeof obj.delete === "function"
    ) {

      try {
        obj.delete();
      } catch (_) {}
    }

  });
}


/* ---------------------------------------------------------
   PREVIEW
--------------------------------------------------------- */

function showPagePreview() {

  const pageNumber =
    pages.length + 1;


  document.getElementById(
    "previewTitle"
  ).textContent =
    `Page ${pageNumber}`;


  frontPreview.src =
    currentPage.front;


  backPreview.src =
    currentPage.back;


  showScreen(
    previewScreen
  );
}


/* ---------------------------------------------------------
   RETAKE FRONT
--------------------------------------------------------- */

retakeFrontBtn.addEventListener(
  "click",
  async () => {

    currentSide = "front";

    updateCameraLabels();

    showScreen(cameraScreen);

    await startCamera();
  }
);


/* ---------------------------------------------------------
   RETAKE BACK
--------------------------------------------------------- */

retakeBackBtn.addEventListener(
  "click",
  async () => {

    currentSide = "back";

    updateCameraLabels();

    showScreen(cameraScreen);

    await startCamera();
  }
);


/* ---------------------------------------------------------
   ADD PAGE
--------------------------------------------------------- */

addPageBtn.addEventListener(
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
      front: currentPage.front,
      back: currentPage.back
    });


    currentPage = {
      front: null,
      back: null
    };


    currentSide = "front";

    updateCameraLabels();

    showScreen(cameraScreen);

    startCamera();
  }
);


/* ---------------------------------------------------------
   FINISH
--------------------------------------------------------- */

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
      front: currentPage.front,
      back: currentPage.back
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


/* ---------------------------------------------------------
   RENDER ALL PAGES
--------------------------------------------------------- */

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
        document.createElement("div");

      item.className =
        "page-item";


      item.innerHTML = `
        <div class="page-item-header">
          <span>Page ${index + 1}</span>
          <span>Front + Back</span>
        </div>

        <div class="page-images">

          <img
            src="${page.front}"
            alt="Page ${index + 1} Front"
          >

          <img
            src="${page.back}"
            alt="Page ${index + 1} Back"
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
            Delete Page
          </button>

        </div>
      `;


      pagesList.appendChild(item);
    }
  );
}


/* ---------------------------------------------------------
   PAGE ACTIONS
--------------------------------------------------------- */

pagesList.addEventListener(
  "click",
  async event => {

    const button =
      event.target.closest("button");

    if (!button) {
      return;
    }


    const index =
      Number(
        button.dataset.index
      );


    const action =
      button.dataset.action;


    if (
      action === "delete"
    ) {

      pages.splice(
        index,
        1
      );

      renderPages();

      return;
    }


    if (
      action === "front"
    ) {

      currentPage = {
        front: pages[index].front,
        back: pages[index].back
      };

      pages.splice(
        index,
        1
      );

      currentSide = "front";

      updateCameraLabels();

      showScreen(
        cameraScreen
      );

      await startCamera();

      return;
    }


    if (
      action === "back"
    ) {

      currentPage = {
        front: pages[index].front,
        back: pages[index].back
      };

      pages.splice(
        index,
        1
      );

      currentSide = "back";

      updateCameraLabels();

      showScreen(
        cameraScreen
      );

      await startCamera();
    }

  }
);


/* ---------------------------------------------------------
   ADD ANOTHER PAGE
--------------------------------------------------------- */

addAnotherBtn.addEventListener(
  "click",
  async () => {

    currentPage = {
      front: null,
      back: null
    };

    currentSide = "front";

    updateCameraLabels();

    showScreen(
      cameraScreen
    );

    await startCamera();
  }
);


/* ---------------------------------------------------------
   CLEAR ALL
--------------------------------------------------------- */

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


/* ---------------------------------------------------------
   PDF
--------------------------------------------------------- */

downloadPdfBtn.addEventListener(
  "click",
  generatePDF
);


async function generatePDF() {

  if (!pages.length) {

    alert(
      "There are no scanned pages."
    );

    return;
  }


  showProcessing(
    "Creating PDF..."
  );


  try {

    const {
      jsPDF
    } = window.jspdf;


    const firstImage =
      await loadImage(
        pages[0].front
      );


    const orientation =
      firstImage.width >
      firstImage.height
        ? "landscape"
        : "portrait";


    /*
     * A4 PDF.
     */

    const pdf =
      new jsPDF({
        orientation,
        unit: "mm",
        format: "a4",
        compress: true
      });


    const pageWidth =
      pdf.internal.pageSize.getWidth();

    const pageHeight =
      pdf.internal.pageSize.getHeight();


    /*
     * Every PDF page represents
     * exactly ONE scanned document page.
     *
     * Top = Front
     * Bottom = Back
     */

    for (
      let i = 0;
      i < pages.length;
      i++
    ) {

      processingText.textContent =
        `Creating PDF page ${
          i + 1
        } of ${pages.length}`;


      if (i > 0) {

        pdf.addPage(
          "a4",
          orientation
        );
      }


      const margin = 8;

      const labelHeight = 7;

      const gap = 5;

      const availableWidth =
        pageWidth -
        margin * 2;


      const halfHeight =
        (
          pageHeight -
          margin * 2 -
          gap -
          labelHeight * 2
        ) / 2;


      /*
       * FRONT
       */

      pdf.setFontSize(10);

      pdf.text(
        `Page ${i + 1} - FRONT`,
        margin,
        margin + 4
      );


      const frontImage =
        await loadImage(
          pages[i].front
        );


      const frontSize =
        fitImage(
          frontImage.width,
          frontImage.height,
          availableWidth,
          halfHeight
        );


      pdf.addImage(
        pages[i].front,
        "JPEG",
        margin +
          (
            availableWidth -
            frontSize.width
          ) / 2,

        margin +
          labelHeight,

        frontSize.width,
        frontSize.height,
        undefined,
        "FAST"
      );


      /*
       * BACK
       */

      const backY =
        pageHeight / 2;


      pdf.setFontSize(10);

      pdf.text(
        `Page ${i + 1} - BACK`,
        margin,
        backY
      );


      const backImage =
        await loadImage(
          pages[i].back
        );


      const backSize =
        fitImage(
          backImage.width,
          backImage.height,
          availableWidth,
          halfHeight
        );


      pdf.addImage(
        pages[i].back,
        "JPEG",
        margin +
          (
            availableWidth -
            backSize.width
          ) / 2,

        backY +
          labelHeight,

        backSize.width,
        backSize.height,
        undefined,
        "FAST"
      );

    }


    pdf.save(
      `document-scan-${getDateString()}.pdf`
    );


    hideProcessing();

  } catch (error) {

    console.error(error);

    hideProcessing();

    alert(
      "Unable to create the PDF."
    );
  }
}


/* ---------------------------------------------------------
   IMAGE HELPERS
--------------------------------------------------------- */

function loadImage(src) {

  return new Promise(
    (resolve, reject) => {

      const image =
        new Image();

      image.onload =
        () => resolve(image);

      image.onerror =
        reject;

      image.src =
        src;
    }
  );
}


function fitImage(
  imageWidth,
  imageHeight,
  maxWidth,
  maxHeight
) {

  const ratio =
    Math.min(
      maxWidth / imageWidth,
      maxHeight / imageHeight
    );


  return {
    width:
      imageWidth * ratio,

    height:
      imageHeight * ratio
  };
}


/* ---------------------------------------------------------
   DATE
--------------------------------------------------------- */

function getDateString() {

  const now =
    new Date();


  const year =
    now.getFullYear();


  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");


  const day =
    String(
      now.getDate()
    ).padStart(2, "0");


  return `${year}-${month}-${day}`;
}


/* ---------------------------------------------------------
   PROCESSING MODAL
--------------------------------------------------------- */

function showProcessing(text) {

  processingText.textContent =
    text;

  processingModal.classList.add(
    "show"
  );
}


function hideProcessing() {

  processingModal.classList.remove(
    "show"
  );
}


/* ---------------------------------------------------------
   CANCEL CAMERA
--------------------------------------------------------- */

cancelCameraBtn.addEventListener(
  "click",
  () => {

    stopCamera();

    if (
      pages.length
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


/* ---------------------------------------------------------
   PREVENT SCREEN SLEEP
--------------------------------------------------------- */

let wakeLock = null;

async function requestWakeLock() {

  try {

    if (
      "wakeLock" in navigator
    ) {

      wakeLock =
        await navigator.wakeLock.request(
          "screen"
        );
    }

  } catch (_) {}
}


document.addEventListener(
  "visibilitychange",
  async () => {

    if (
      document.visibilityState ===
      "visible" &&
      cameraStream
    ) {

      await requestWakeLock();
    }

  }
);
