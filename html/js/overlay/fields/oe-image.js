"use strict";
class OEIMAGEFIELD extends OEFIELD {

  static DEFAULTIMAGEOPACITY = 1;
  static DEFAULTIMAGEROTATION = 0;
  static DEFAULTIMAGESCALE = 1

  static MISSING = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAQAAABpN6lAAAAEm0lEQVR42u2dX2iOURzHX/vDmPyvubBdoIRIubGU0lxoV4oZJanVRomtSSm5oCSFcuGG3C1TuDFpLkhRSORCigsXckOZUkPb3q9zznN23rO97/P3nGee5z2/7+lpF3v37Pw+5/v77fx5elYokEgkEolEIpFIJBKJ5J4wy+1GDsAKt1sBo263AhxXAUW3GzmAABCAaSpivIpbkRwQCGCCXYPoRDe6qrB1s8gGZZQ+AMbY1ctmh3VVOedlUaFXRhkAoJ99rAF1VdgaWGT94QD6qtoBfQSAABAAAkAACAABIAAEgADkBADroasAvNBRw09v4CYAcXAnLhsIcgbAG3127cTygoTgEAAV/mr8xln2tda8FuQMADwAQ6xHP7FR4nAFgBj/Wnb1sP78ZdeQKIauAFD2X4PvYpueb2Luk0jcACDt/4D1Zlzu4n7CMtNSmBMAU+w/uYHNMVwxLYW5AFBm/8nTKg6h1SwNcgJgmv2heeCxnBhVL4CK9tdPrXpMPJB5AD72h5YGX9GSvBTmAICP/fU0uJl8RpBxAMr+RyrYX3fBjqRpkGkAyv7r8KOC/fU68Aqzk6VBxgFI+w/72F9Pg5PJZgQZBqDsfzQkfM8bI1ibpBJkFkBE++seuJtBAN6uTZKHjyPbX68Eu+KXwpkAIJ+/Rjr21wG8x8K4pTBVAHL8azEHsbYuYtpfT4PzcUthigDUKG7FCzTHMWds+5dK4R9sjrdPlBoAz/zsWoJ37Odfi03MSB1LYH/dA8PxFkcpAUBpFG+JcQGeY3EUBAntr1eCg7HcliIA3okTclz4PZ5gfjiChPbX0+BznC3zVAAoE7eJx1CL6i4PMTcYgYH99TS4Fr0UpgBAmbiFjYW+hOH3uYN6NjY+CAztr7tgW9Q0sA5A/eWvwaOyUeR3GhDHWhXnBYb21z3wzJsT/hcAMvsvVAxiTK3eyxBYsL+O4Fg0D1gGoILY67t+5527Wo7Akv1LSfANK721wQwCUOGvF9tXfhsY/H4XRZnSEFiyv455IMriyCIANfVpxMvAIIrie+d0BBbtr7ugPTwNrAKQ2X89wvqdf/+U98fKsv31KdFbzAubEVgDMGX3bjzC+PDPHOd3hW3762lwJmxGYAmACr8VoxHH0DvePCwR2LV/KQl+YUPI1MsGAGXhJnwIKH7lHeRdPMR+brZl++seuB9cCi0A0Cx8L+YYFkUqdIi7DFse/1Il6AwqhbYA8F9wOkEIEwLBdnSlEr4H4COW+pdCYwAq+9tlOEkydUTYPx1xrJf8S6EhAJX9q/AlRvaXJ0IxNQBFEcEWvzQwAqCe2avHUyMLpwkg5BDdEIDM/sspZbDNStBd2QMGAFT2H8h4+JOH6M2VSmFiACr8TayEJc3+mROP4UalGYGJA/hCZgHeiE/weV3WG9DmDZodB3gPK9/OvP2nLo4aC9MO6gwAsGsR9mMPOnLSdrPeNlkDUC0yK4J8fpWvVr4TSQ4gAASAABAAAkAACAC9RicYQK/LL1Jy/lVaDopep0cOIACuA6DX6rruAOdfre36y9WdF/2DBRKJRCKRSCQSiUQikZzTPx4GH1duSDeMAAAAAElFTkSuQmCC';

  DEFAULTS = {
    'opacity': {
      'path': 'opacity',
      'defaultpath': 'settings.defaultimagetopacity',
      'default': OEIMAGEFIELD.DEFAULTIMAGEOPACITY
    },
    'rotate': {
      'path': 'rotate',
      'defaultpath': 'settings.defaultimagerotation',
      'default': OEIMAGEFIELD.DEFAULTIMAGEROTATION
    },
    'scale': {
      'path': 'scale',
      'defaultpath': 'settings.defaultimagescale',
      'default': OEIMAGEFIELD.DEFAULTIMAGESCALE
    }
  };

  constructor(fieldData, id) {
    super('images', id);
    this.config = window.oedi.get('config');
    this.fieldData = fieldData;

    this.setDefaults();

    this.fieldData.src = window.oedi.get('IMAGEDIR') + this.fieldData.image;
    this.createShape();
  }

  createShape() {
    /*  var imageObj = new Image();
  
      if (this.fieldData.image !== 'missing') {
        imageObj.src = this.fieldData.src;
  
        const load = url => new Promise(resolve => {
          imageObj.onload = () => resolve({ imageObj })
          imageObj.src = url
        });
  
        (async () => {
          const { imageObj } = await load(this.fieldData.src);
          this.shape.scaleX(this.fieldData.scale);
          this.shape.scaleY(this.fieldData.scale);
        })();
      } else {
        imageObj.src = OEIMAGEFIELD.MISSING;
      }
  */

    this.setImage(this.fieldData.image).then((imageObj) => {
      this.shape.image(imageObj);
      this.dirty = false;
    });

    this.shape = new Konva.Image({
      id: this.id,
      x: this.fieldData.x,
      y: this.fieldData.y,
      //image: imageObj,
      rotation: this.fieldData.rotate,
      opacity: this.fieldData.opacity,
      draggable: true,
      name: 'field',
      perfectDrawEnabled: false
    });
  }

  get image() {
    return this.fieldData.image;
  }
  set im2age(image) {
    var imageObj = new Image();

    if (image !== 'missing') {
      this.fieldData.src = window.oedi.get('IMAGEDIR') + image;

      imageObj.src = this.fieldData.src;

      const load = url => new Promise(resolve => {
        imageObj.onload = () => resolve({ imageObj })
        imageObj.src = url
      });

      (async () => {
        const { imageObj } = await load(this.fieldData.src);
        this.shape.scaleX(this.fieldData.scale);
        this.shape.scaleY(this.fieldData.scale);
      })();
    } else {
      imageObj.src = OEIMAGEFIELD.MISSING;
    }

    this.shape.image(imageObj);
    this.fieldData.image = image;
    this.dirty = true;
  }

  setImage(imageName) {
    return new Promise(resolve => {
      const image = new Image();
      image.addEventListener('load', () => {
        if (this.shape !== null) {
          this.shape.image(image);
          this.shape.scaleX(this.fieldData.scale);
          this.shape.scaleY(this.fieldData.scale);
          this.dirty = true;
        }
        this.fieldData.image = imageName;
        resolve(image);
      });
      if (imageName !== 'missing') {
        this.fieldData.src = window.oedi.get('IMAGEDIR') + imageName;
        image.src = this.fieldData.src;
      } else {
        image.src = OEIMAGEFIELD.MISSING;
      }
    });
  }

  get scale() {
    return this.fieldData.scale;
  }
  set scale(scale) {
    this.fieldData.scale = scale;
    this.shape.scaleX(scale);
    this.shape.scaleY(scale);
    this.dirty = true;
  }

}