const FULL_TURN = Math.PI * 2;
const HALF_TURN = Math.PI;

/**
 * Interpolates Pixi transforms between fixed simulation steps without changing
 * entity coordinates used by collisions, targeting, or other gameplay rules.
 */
export class RenderInterpolator {
  beginStep(root) {
    if (root) this.beginNode(root);
  }

  captureStep(root) {
    if (root) this.captureNode(root);
  }

  render(root, alpha) {
    if (!root) return;
    const blend = Math.max(0, Math.min(1, alpha));
    this.renderNode(root, blend);
  }

  snapToCurrent(root) {
    if (root) this.snapNodeToCurrent(root);
  }

  reset(root) {
    if (root) this.resetNode(root);
  }

  beginNode(node) {
    const children = node.children;
    if (!node.visible && (!children || children.length === 0)) {
      node._renderWasVisibleAtStepStart = false;
      return;
    }
    if (!node._renderInterpolationReady) {
      this.initializeNode(node);
    } else {
      this.restoreCurrentTransform(node);
      node._renderPreviousX = node._renderCurrentX;
      node._renderPreviousY = node._renderCurrentY;
      node._renderPreviousRotation = node._renderCurrentRotation;
      node._renderPreviousScaleX = node._renderCurrentScaleX;
      node._renderPreviousScaleY = node._renderCurrentScaleY;
    }

    node._renderWasVisibleAtStepStart = node.visible;
    if (children) {
      for (let i = 0; i < children.length; i++) this.beginNode(children[i]);
    }
  }

  captureNode(node) {
    const children = node.children;
    if (!node.visible && (!children || children.length === 0)) {
      node._renderWasVisibleAtStepStart = false;
      return;
    }
    if (!node._renderInterpolationReady) {
      this.initializeNode(node);
    } else {
      if (!node._renderWasVisibleAtStepStart && node.visible) {
        // Reused pooled sprites should appear at their new position, not travel from an old one.
        node._renderPreviousX = node.x;
        node._renderPreviousY = node.y;
        node._renderPreviousRotation = node.rotation;
        node._renderPreviousScaleX = node.scale.x;
        node._renderPreviousScaleY = node.scale.y;
      }
      this.captureCurrentTransform(node);
    }

    node._renderWasVisibleAtStepStart = node.visible;
    if (children) {
      for (let i = 0; i < children.length; i++) this.captureNode(children[i]);
    }
  }

  renderNode(node, alpha) {
    const children = node.children;
    if (!node.visible && (!children || children.length === 0)) {
      node._renderWasVisibleAtStepStart = false;
      return;
    }
    if (!node._renderInterpolationReady) {
      this.initializeNode(node);
    } else if (!node._renderWasVisibleAtStepStart && node.visible) {
      // Objects activated between simulation ticks begin rendering at their spawn transform.
      node._renderPreviousX = node.x;
      node._renderCurrentX = node.x;
      node._renderPreviousY = node.y;
      node._renderCurrentY = node.y;
      node._renderPreviousRotation = node.rotation;
      node._renderCurrentRotation = node.rotation;
      node._renderPreviousScaleX = node.scale.x;
      node._renderCurrentScaleX = node.scale.x;
      node._renderPreviousScaleY = node.scale.y;
      node._renderCurrentScaleY = node.scale.y;
    }
    node._renderWasVisibleAtStepStart = node.visible;

    node.x = node._renderPreviousX + (node._renderCurrentX - node._renderPreviousX) * alpha;
    node.y = node._renderPreviousY + (node._renderCurrentY - node._renderPreviousY) * alpha;
    node.rotation = this.interpolateAngle(node._renderPreviousRotation, node._renderCurrentRotation, alpha);
    node.scale.x = node._renderPreviousScaleX + (node._renderCurrentScaleX - node._renderPreviousScaleX) * alpha;
    node.scale.y = node._renderPreviousScaleY + (node._renderCurrentScaleY - node._renderPreviousScaleY) * alpha;

    if (children) {
      for (let i = 0; i < children.length; i++) this.renderNode(children[i], alpha);
    }
  }

  snapNodeToCurrent(node) {
    const children = node.children;
    if (!node.visible && (!children || children.length === 0)) {
      node._renderWasVisibleAtStepStart = false;
      return;
    }
    if (!node._renderInterpolationReady) {
      this.initializeNode(node);
    } else {
      this.restoreCurrentTransform(node);
      node._renderPreviousX = node._renderCurrentX;
      node._renderPreviousY = node._renderCurrentY;
      node._renderPreviousRotation = node._renderCurrentRotation;
      node._renderPreviousScaleX = node._renderCurrentScaleX;
      node._renderPreviousScaleY = node._renderCurrentScaleY;
    }

    node._renderWasVisibleAtStepStart = node.visible;
    if (children) {
      for (let i = 0; i < children.length; i++) this.snapNodeToCurrent(children[i]);
    }
  }

  resetNode(node) {
    node._renderInterpolationReady = true;
    node._renderPreviousX = node.x;
    node._renderCurrentX = node.x;
    node._renderPreviousY = node.y;
    node._renderCurrentY = node.y;
    node._renderPreviousRotation = node.rotation;
    node._renderCurrentRotation = node.rotation;
    node._renderPreviousScaleX = node.scale.x;
    node._renderCurrentScaleX = node.scale.x;
    node._renderPreviousScaleY = node.scale.y;
    node._renderCurrentScaleY = node.scale.y;
    node._renderWasVisibleAtStepStart = node.visible;

    const children = node.children;
    if (children) {
      for (let i = 0; i < children.length; i++) this.resetNode(children[i]);
    }
  }

  initializeNode(node) {
    node._renderInterpolationReady = true;
    node._renderPreviousX = node.x;
    node._renderCurrentX = node.x;
    node._renderPreviousY = node.y;
    node._renderCurrentY = node.y;
    node._renderPreviousRotation = node.rotation;
    node._renderCurrentRotation = node.rotation;
    node._renderPreviousScaleX = node.scale.x;
    node._renderCurrentScaleX = node.scale.x;
    node._renderPreviousScaleY = node.scale.y;
    node._renderCurrentScaleY = node.scale.y;
    node._renderWasVisibleAtStepStart = node.visible;
  }

  restoreCurrentTransform(node) {
    node.x = node._renderCurrentX;
    node.y = node._renderCurrentY;
    node.rotation = node._renderCurrentRotation;
    node.scale.x = node._renderCurrentScaleX;
    node.scale.y = node._renderCurrentScaleY;
  }

  captureCurrentTransform(node) {
    node._renderCurrentX = node.x;
    node._renderCurrentY = node.y;
    node._renderCurrentRotation = node.rotation;
    node._renderCurrentScaleX = node.scale.x;
    node._renderCurrentScaleY = node.scale.y;
  }

  interpolateAngle(previous, current, alpha) {
    if (alpha <= 0) return previous;
    if (alpha >= 1) return current;

    let difference = (current - previous) % FULL_TURN;
    if (difference > HALF_TURN) difference -= FULL_TURN;
    if (difference < -HALF_TURN) difference += FULL_TURN;
    return previous + difference * alpha;
  }
}
