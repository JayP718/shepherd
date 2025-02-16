import merge from 'deepmerge';
import { shouldCenterStep } from './general';
import {
  computePosition,
  autoUpdate,
  shift,
  arrow,
  limitShift
} from '@floating-ui/dom';

/**
 * Floating UI Options
 *
 * @typedef {object} FloatingUIOptions
 */

/**
 * Determines options for the tooltip and initializes event listeners.
 *
 * @param {Step} step The step instance
 *
 * @return {FloatingUIOptions}
 */
export function setupTooltip(step) {
  if (step.cleanup) {
    step.cleanup();
  }

  const attachToOptions = step._getResolvedAttachToOptions();

  let target = attachToOptions.element;
  const floatingUIOptions = getFloatingUIOptions(attachToOptions, step);

  if (shouldCenterStep(attachToOptions)) {
    target = document.body;
    const content = step.shepherdElementComponent.getElement();
    content.classList.add('shepherd-centered');
  }

  step.cleanup = autoUpdate(target, step.el, () => {
    // The element might have already been removed by the end of the tour.
    if (!step.el) {
      step.cleanup();
      return;
    }

    setPosition(target, step, floatingUIOptions);
  });

  step.target = attachToOptions.element;

  return floatingUIOptions;
}

/**
 * Merge tooltip options handling nested keys.
 *
 * @param tourOptions - The default tour options.
 * @param options - Step specific options.
 *
 * @return {floatingUIOptions: FloatingUIOptions}
 */
export function mergeTooltipConfig(tourOptions, options) {
  return {
    floatingUIOptions: merge(
      tourOptions.floatingUIOptions || {},
      options.floatingUIOptions || {}
    )
  };
}

/**
 * Cleanup function called when the step is closed/destroyed.
 *
 * @param {Step} step
 */
export function destroyTooltip(step) {
  if (step.cleanup) {
    step.cleanup();
  }

  step.cleanup = null;
}

/**
 *
 * @return {Promise<*>}
 */
function setPosition(target, step, floatingUIOptions) {
  return (
    computePosition(target, step.el, floatingUIOptions)
      .then(floatingUIposition(step))
      // Wait before forcing focus.
      .then(
        (step) =>
          new Promise((resolve) => {
            setTimeout(() => resolve(step), 300);
          })
      )
      // Replaces focusAfterRender modifier.
      .then((step) => {
        if (step && step.el) {
          step.el.focus({ preventScroll: true });
        }
      })
  );
}

/**
 *
 * @param step
 * @return {function({x: *, y: *, placement: *, middlewareData: *}): Promise<unknown>}
 */
function floatingUIposition(step) {
  return ({ x, y, placement, middlewareData }) => {
    if (!step.el) {
      return step;
    }

    Object.assign(step.el.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`
    });

    step.el.dataset.popperPlacement = placement;

    placeArrow(step.el, placement, middlewareData);

    return step;
  };
}

/**
 *
 * @param el
 * @param placement
 * @param middlewareData
 */
function placeArrow(el, placement, middlewareData) {
  const arrowEl = el.querySelector('.shepherd-arrow');
  if (arrowEl) {
    const { x: arrowX, y: arrowY } = middlewareData.arrow;

    const staticSide = {
      top: 'bottom',
      right: 'left',
      bottom: 'top',
      left: 'right'
    }[placement.split('-')[0]];

    Object.assign(arrowEl.style, {
      left: arrowX != null ? `${arrowX}px` : '',
      top: arrowY != null ? `${arrowY}px` : '',
      right: '',
      bottom: '',
      [staticSide]: '-35px'
    });
  }
}

/**
 * Gets the `Floating UI` options from a set of base `attachTo` options
 * @param attachToOptions
 * @param {Step} step The step instance
 * @return {Object}
 * @private
 */
export function getFloatingUIOptions(attachToOptions, step) {
  const options = {
    strategy: 'absolute',
    middleware: [
      // Replicate PopperJS default behavior.
      shift({
        limiter: limitShift(),
        crossAxis: true
      })
    ]
  };

  const arrowEl = addArrow(step);
  if (arrowEl) {
    options.middleware.push(arrow({ element: arrowEl }));
  }

  if (!shouldCenterStep(attachToOptions)) {
    options.placement = attachToOptions.on;
  }

  return merge(step.options.floatingUIOptions || {}, options);
}

/**
 * @param {Step} step
 * @return {HTMLElement|false|null}
 */
function addArrow(step) {
  if (step.options.arrow && step.el) {
    return step.el.querySelector('.shepherd-arrow');
  }

  return false;
}
